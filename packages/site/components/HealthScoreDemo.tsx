"use client";

import React, { useMemo, useCallback, useState } from "react";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useHealthScore } from "@/hooks/useHealthScore";

/**
 * Outer wrapper:
 * - Gère la connexion MetaMask
 * - Calcule une clé de remount basée sur (address + chainId)
 * - Remonte <HealthScorePanel key=...> pour réinitialiser tous les états
 *   quand on change de compte/réseau.
 */
export default function HealthScoreDemo() {
  const { isConnected, connect, ethersSigner, accounts, chainId } =
    useMetaMaskEthersSigner();

  // Adresse affichée (si connecté)
  const displayAddress =
    ethersSigner?.address ?? (accounts?.length ? accounts[0] : undefined);

  // Clé de remount: change quand compte ou chain change
  const remountKey = `${displayAddress ?? "noacc"}-${chainId ?? "nochain"}`;

  if (!isConnected) {
    return (
      <div className="flex justify-center mt-10">
        <button
          className="px-6 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition"
          onClick={connect}
        >
          Connect to MetaMask
        </button>
      </div>
    );
  }

  return <HealthScorePanel key={remountKey} />;
}

/**
 * Inner panel:
 * - Contient toute la logique FHE/contrat + UI
 * - Grâce à la clé du parent, ce composant est ré-monté
 *   quand l'adresse ou la chaîne change → tout est reset automatiquement.
 */
function HealthScorePanel() {
  // Connexion (pour affichage "Connected as")
  const { ethersSigner, accounts } = useMetaMaskEthersSigner();
  const signerAddress =
    ethersSigner?.address ?? (accounts?.length ? accounts[0] : undefined);

  // Logique FHE / contrat
  const {
    chainId,
    address,
    handle,
    clearScore,
    busy,
    msg,
    fhevmStatus,
    fhevmError,
    submitMetrics,
    getScoreHandle,
    decryptScore,
    grantTo,
  } = useHealthScore();

  // État formulaire
  const [age, setAge] = useState<number>(45);
  const [sbp, setSbp] = useState<number>(120);
  const [chol, setChol] = useState<number>(180);
  const [smoker, setSmoker] = useState<boolean>(false);

  const [viewer, setViewer] = useState<string>("");
  const [userToRead, setUserToRead] = useState<string>("");

  const canSubmit = useMemo(() => {
    return age > 0 && age < 130 && sbp > 50 && chol > 50 && !busy;
  }, [age, sbp, chol, busy]);

  const onSubmit = useCallback(async () => {
    await submitMetrics(age, sbp, chol, smoker);
  }, [age, sbp, chol, smoker, submitMetrics]);

  const onGetHandle = useCallback(async () => {
    await getScoreHandle(userToRead || undefined);
  }, [userToRead, getScoreHandle]);

  const onDecrypt = useCallback(async () => {
    await decryptScore();
  }, [decryptScore]);

  const onGrant = useCallback(async () => {
    if (!viewer) return;
    await grantTo(viewer);
  }, [viewer, grantTo]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h2 className="text-3xl font-bold">Private Health Score (demo)</h2>

      {/* Intro */}
      <div className="p-4 rounded-lg bg-gray-50 border border-gray-300 text-gray-800 space-y-3">
        <p>
          I’m an <strong>AI engineer</strong> (new to smart-contract dev) building a
          company to help medical researchers. A core blocker we see:{" "}
          <strong>privacy constraints</strong> prevent multi-center data pooling.
          Valuable datasets can’t be standardized or shared across sites.
        </p>
        <p>
          With <strong>FHE on-chain</strong>, patient metrics stay encrypted
          end-to-end while we still compute. The contract runs on ciphertexts and
          only authorized parties decrypt the output—never the inputs. This enables
          GDPR-compliant collaboration for researchers and even lets{" "}
          <strong>insurers</strong> consume risk signals without touching raw PHI.
        </p>
      </div>

      {/* Formula */}
      <div className="p-4 rounded-lg bg-white border border-gray-200 text-gray-700">
        <p className="text-sm mt-2">
          Inspired by the <strong>Framingham Risk Score</strong> (used by clinicians
          and insurers to estimate 10-year cardiovascular risk), we show a simplified
          surrogate to highlight homomorphic computation and access control.
        </p>
        <p className="font-semibold mb-2">Simplified health score formula:</p>
        <p className="font-mono bg-gray-100 p-2 rounded">
          score = age + systolic BP + cholesterol + smokerFlag(50/0)
        </p>
      </div>

      {/* Chain / Contract / Connected */}
      <div className="rounded-xl border p-4 space-y-1 text-sm">
        <div>ChainId: <b>{chainId ?? "?"}</b></div>
        <div>Contract: <b className="font-mono">{address ?? "N/A"}</b></div>
        <div>Connected as: <b className="font-mono">{signerAddress ?? "(unknown)"}</b></div>
        <div>
          Handle:{" "}
          {handle ? (
            <b className="break-all font-mono">{handle}</b>
          ) : (
            "(none)"
          )}
        </div>
        <div>Clear score: <b>{clearScore ?? "(not decrypted)"}</b></div>
      </div>

      {/* FHEVM status */}
      <div className="rounded-xl border p-4 space-y-1 text-sm">
        <div>FHEVM status: <b>{fhevmStatus}</b></div>
        <div className="text-sm text-gray-500">
          {fhevmError ? `FHEVM error: ${String(fhevmError)}` : "No FHEVM error"}
        </div>
      </div>

      {/* Usage guide */}
      <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-300 text-indigo-900 space-y-2 text-sm">
        <p className="font-semibold">How to use this demo:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Enter the patient metrics (Age, SBP, Cholesterol, Smoker).</li>
          <li>
            Click <em>Submit metrics</em> → values are <strong>encrypted locally</strong> and sent on-chain.
          </li>
          <li>
            Click <em>Get score handle</em> → retrieve the <strong>encrypted result handle</strong>.
          </li>
          <li>
            Click <em>Decrypt</em> → decrypt the output with your <strong>private key</strong>,
            proving access to the result without revealing inputs/intermediates.
          </li>
          <li>
            Optionally <em>Grant access</em> to another address (doctor/insurer) so they can have access to your score.
            Only authorized viewer can have access to it. 
          </li>
        </ol>
      </div>

      {/* Inputs */}
      <div className="rounded-xl border p-4 grid grid-cols-2 gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span>Age (years)</span>
          <input
            type="number"
            className="border rounded px-2 py-1"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            min={1}
            max={129}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>Systolic BP (mmHg)</span>
          <input
            type="number"
            className="border rounded px-2 py-1"
            value={sbp}
            onChange={(e) => setSbp(Number(e.target.value))}
            min={60}
            max={260}
          />
        </label>

        {/* Cholesterol + Smoker side-by-side */}
        <label className="flex flex-col gap-1">
          <span>Total Cholesterol (mg/dL)</span>
          <input
            type="number"
            className="border rounded px-2 py-1"
            value={chol}
            onChange={(e) => setChol(Number(e.target.value))}
            min={80}
            max={400}
          />
        </label>

        <label className="flex flex-row items-center gap-2">
          <input
            type="checkbox"
            checked={smoker}
            onChange={(e) => setSmoker(e.target.checked)}
          />
          <span>Smoker</span>
        </label>
      </div>

      {/* Actions */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-40"
          >
            Submit metrics
          </button>

          <button
            onClick={onGetHandle}
            disabled={busy}
            className="px-3 py-2 rounded bg-gray-900 text-white disabled:opacity-40"
          >
            Get score handle
          </button>

          <button
            onClick={onDecrypt}
            disabled={busy || !handle}
            className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-40"
          >
            Decrypt
          </button>
        </div>

        {/* Optional: read other user / grant access */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Read other user (address)</span>
            <input
              placeholder="0x... (leave empty = me)"
              className="border rounded px-2 py-1"
              value={userToRead}
              onChange={(e) => setUserToRead(e.target.value)}
            />
          </label>

          <div className="flex gap-2 items-end">
            <input
              placeholder="Grant to address (0x...)"
              className="border rounded px-2 py-1 flex-1"
              value={viewer}
              onChange={(e) => setViewer(e.target.value)}
            />
            <button
              onClick={onGrant}
              disabled={busy || !viewer}
              className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-40"
            >
              Grant access
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-[1.5rem] text-sm">
        {busy ? <span className="opacity-80">Working…</span> : null}
        {msg ? (
          <div className="mt-2 p-2 rounded border bg-gray-50">
            <span className="font-medium">Message:</span> {msg}
          </div>
        ) : null}
      </div>
    </div>
  );
}
