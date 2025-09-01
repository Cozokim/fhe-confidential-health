"use client";

import { useCallback, useMemo, useState } from "react";
import { ethers } from "ethers";

// MetaMask hooks du template
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

// FHEVM: hook principal
import { useFhevm } from "@/fhevm/useFhevm";

// Decryption signature utils
import { GenericStringInMemoryStorage } from "@/fhevm/GenericStringStorage";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

// ABI + addresses (auto-générés via npm run genabi)
import { PrivateHealthScoreABI } from "@/abi/PrivateHealthScoreABI";
import { PrivateHealthScoreAddresses } from "@/abi/PrivateHealthScoreAddresses";

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
function resolveAddressByChainId(chainId?: number) {
  if (chainId === 1337) chainId = 31337;
  if (!chainId) return undefined;
  const entry =
    PrivateHealthScoreAddresses[
      String(chainId) as keyof typeof PrivateHealthScoreAddresses
    ] as { address: string; chainId: number; chainName: string } | undefined;
  if (!entry || entry.address === ethers.ZeroAddress) return undefined;
  return entry.address as `0x${string}`;
}

// -----------------------------------------------------------------------------
// Hook principal (exporté)
// -----------------------------------------------------------------------------
export function useHealthScore() {
  const { chainId, provider } = useMetaMask();
  const { ethersSigner, initialMockChains } = useMetaMaskEthersSigner();

  const signer = ethersSigner;
  const address = useMemo(() => resolveAddressByChainId(chainId), [chainId]);

  const { instance, status, error } = useFhevm({
    provider,
    chainId,
    enabled: Boolean(provider),
    initialMockChains,
  });

  const [handle, setHandle] = useState<string | undefined>();
  const [clearScore, setClearScore] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | undefined>();
  const [decSig, setDecSig] = useState<FhevmDecryptionSignature | null>(null);

  const decSigStore = useMemo(() => new GenericStringInMemoryStorage(), []);

  // Contrat typé
  const contract = useMemo(() => {
    if (!address || !signer) return undefined;
    return new ethers.Contract(address, PrivateHealthScoreABI.abi, signer);
  }, [address, signer]);

  // ---------------------------------------------------------------------------
  // Ensure decryption signature (cache + auto-sign si besoin)
  // ---------------------------------------------------------------------------
  const ensureDecSig = useCallback(async () => {
    if (!instance || !signer || !address) {
      throw new Error("FHEVM instance/signer/address not ready");
    }
    if (decSig && decSig.isValid()) {
      return decSig;
    }
    const newSig = await FhevmDecryptionSignature.loadOrSign(
      instance,
      [address],
      signer,
      decSigStore
    );
    if (!newSig) {
      throw new Error("Failed to generate/load FHE decryption signature");
    }
    setDecSig(newSig);
    return newSig;
  }, [instance, signer, address, decSig, decSigStore]);

  // ---------------------------------------------------------------------------
  // 1) Soumettre des métriques chiffrées (4 métriques)
  // ---------------------------------------------------------------------------
  const submitMetrics = useCallback(
  async (age: number, sbp: number, chol: number, smoker: boolean) => {
    if (!contract || !address || !signer || !instance) return;
    setBusy(true);
    setMsg(undefined);
    try {
      const who = await signer.getAddress();
      const encAge  = await instance.createEncryptedInput(address, who).add32(age).encrypt();
      const encSbp  = await instance.createEncryptedInput(address, who).add32(sbp).encrypt();
      const encChol = await instance.createEncryptedInput(address, who).add32(chol).encrypt();

      // 👉 bool -> 0/1 (et NON plus 50/0)
      const smoker01 = smoker ? 1 : 0;
      const encSmok01 = await instance.createEncryptedInput(address, who).add32(smoker01).encrypt();

      const tx = await contract.submitMetrics(
        encAge.handles[0],  encAge.inputProof,
        encSbp.handles[0],  encSbp.inputProof,
        encChol.handles[0], encChol.inputProof,
        encSmok01.handles[0], encSmok01.inputProof
      );
      await tx.wait();
      setMsg("Metrics submitted & score computed.");
    } catch (e:any) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [contract, address, signer, instance]
);


// 2) Récupérer le handle chiffré
// ---------------------------------------------------------------------------
const getScoreHandle = useCallback(
  async (userAddress?: string) => {
    if (!contract || !signer) {
      setMsg("Contract ou signer manquant");
      return;
    }
    setBusy(true);
    setMsg(undefined);
    try {
      const who = userAddress ?? (await signer.getAddress());
      const i = new ethers.Interface([
        "function getRiskScore(address) view returns (bytes32)",
      ]);
      const raw = new ethers.Contract(contract.target as string, i, signer);

      const h: string = await raw.getRiskScore(who);

      setHandle(h);
      setMsg(`Handle reçu pour ${who}: ${h}`);
      return h;
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  },
  [contract, signer]
);
// ---------------------------------------------------------------------------
// 3) Déchiffrer le score (SDK userDecrypt)
// ---------------------------------------------------------------------------
const decryptScore = useCallback(async () => {
  if (!address || !handle || !instance || !signer) return;
  setBusy(true);
  setMsg(undefined);
  try {
    const sig = await ensureDecSig();

    const result = await instance.userDecrypt(
      [{ handle, contractAddress: address }],
      sig.privateKey,
      sig.publicKey,
      sig.signature,
      sig.contractAddresses,
      sig.userAddress,
      sig.startTimestamp,
      sig.durationDays
    );

    console.log("[decryptScore] raw result", result);

    // Normalise le résultat vers "firstValue"
    let firstValue: unknown;

    if (Array.isArray(result)) {
      // cas: [bigint, ...]
      firstValue = result[0];
    } else if (result && typeof result === "object") {
      // cas: { results: [bigint, ...] } OU { "<handle>": bigint, ... }
      const maybeResults = (result as any).results;
      if (Array.isArray(maybeResults)) {
        firstValue = maybeResults[0];
      } else {
        const values = Object.values(result as Record<string, unknown>);
        firstValue = values[0];
      }
    } else {
      firstValue = undefined;
    }

    // Convertit en number si possible
    let clearNumber: number | undefined;
    if (typeof firstValue === "bigint") {
      clearNumber = Number(firstValue);
    } else if (firstValue && typeof (firstValue as any).toString === "function") {
      const asNum = Number((firstValue as any).toString());
      clearNumber = Number.isNaN(asNum) ? undefined : asNum;
    }

    if (clearNumber === undefined) {
      throw new Error(
        "Unexpected decrypt result shape. See console for result payload."
      );
    }

    setClearScore(clearNumber);
    setMsg(`Score decrypted: ${clearNumber}`);
    return clearNumber;
  } catch (e: any) {
    // MetaMask essaye parfois de résoudre de l’ENS → bruite une vraie erreur d’accès
    if (e?.code === "UNSUPPORTED_OPERATION" && e?.operation === "getEnsAddress") {
      setMsg("Address not authorized to decrypt.");
    } else {
      setMsg(e?.message || "Decryption failed");
    }
  } finally {
    setBusy(false);
  }
}, [address, handle, instance, signer, ensureDecSig]);

  // ---------------------------------------------------------------------------
  // 4) Grant d’accès
  // ---------------------------------------------------------------------------
  const grantTo = useCallback(
    async (viewer: string) => {
      if (!contract) return;
      setBusy(true);
      setMsg(undefined);
      try {
        const tx = await contract.grantScoreAccess(viewer as `0x${string}`);
        await tx.wait();
        setMsg(`Granted to ${viewer}`);
      } catch (e: any) {
        setMsg(e?.message || String(e));
      } finally {
        setBusy(false);
      }
    },
    [contract]
  );

  return {
    chainId,
    address,
    handle,
    clearScore,
    busy,
    msg,
    fhevmStatus: status,
    fhevmError: error,
    submitMetrics,   // (age, sbp, chol, smoker)
    getScoreHandle,
    decryptScore,
    grantTo,
  };
}
