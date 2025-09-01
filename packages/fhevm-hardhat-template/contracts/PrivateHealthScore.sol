// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PrivateHealthScore - compute an encrypted risk score from encrypted medical metrics.
/// @notice score = age + sbp + chol + smokerPoints (smokerPoints = 50 si fumeur, 0 sinon)
contract PrivateHealthScore is SepoliaConfig {
  struct Metrics {
    euint32 age;        // years
    euint32 sbp;        // systolic blood pressure (mmHg)
    euint32 chol;       // total cholesterol (mg/dL)
    euint32 smoker01;   // 1 if smoker, 0 otherwise (envoyé par le front)
  }

  mapping(address => Metrics) private patientMetrics;
  mapping(address => euint32) private riskScore; // encrypted score

  /// @notice Submit encrypted metrics and compute/update encrypted risk score.
  /// @dev The 'smoker' input is 0/1; we convert it to an ebool and apply 50 points on-chain.
  function submitMetrics(
    externalEuint32 age_ext,   bytes calldata ageProof,
    externalEuint32 sbp_ext,   bytes calldata sbpProof,
    externalEuint32 chol_ext,  bytes calldata cholProof,
    externalEuint32 smok_ext,  bytes calldata smokProof
  ) external {
    euint32 age   = FHE.fromExternal(age_ext,  ageProof);
    euint32 sbp   = FHE.fromExternal(sbp_ext,  sbpProof);
    euint32 chol  = FHE.fromExternal(chol_ext, cholProof);
    euint32 smoker01 = FHE.fromExternal(smok_ext, smokProof); // 0 or 1

    // Convert 0/1 -> ebool via a comparison with 0
    euint32 zero = FHE.asEuint32(0);
    ebool isSmoker = FHE.ne(smoker01, zero);

    // smokerPts = select(isSmoker, 50, 0)
    euint32 fifty = FHE.asEuint32(50);
    euint32 smokerPts = FHE.select(isSmoker, fifty, zero);

    patientMetrics[msg.sender] = Metrics(age, sbp, chol, smoker01);

    // score = age + sbp + chol + smokerPts
    euint32 score = FHE.add(FHE.add(age, sbp), FHE.add(chol, smokerPts));
    riskScore[msg.sender] = score;

    // Permissions: contrat + patient
    FHE.allowThis(score);
    FHE.allow(score, msg.sender);
  }

  function getRiskScore(address user) external view returns (euint32) {
    return riskScore[user];
  }

  function grantScoreAccess(address viewer) external {
    euint32 score = riskScore[msg.sender];
    FHE.allow(score, viewer);
  }
}
