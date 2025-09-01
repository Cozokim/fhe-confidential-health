
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const PrivateHealthScoreABI = {
  "abi": [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getRiskScore",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        }
      ],
      "name": "grantScoreAccess",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "externalEuint32",
          "name": "age_ext",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "ageProof",
          "type": "bytes"
        },
        {
          "internalType": "externalEuint32",
          "name": "sbp_ext",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "sbpProof",
          "type": "bytes"
        },
        {
          "internalType": "externalEuint32",
          "name": "chol_ext",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "cholProof",
          "type": "bytes"
        },
        {
          "internalType": "externalEuint32",
          "name": "smok_ext",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "smokProof",
          "type": "bytes"
        }
      ],
      "name": "submitMetrics",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
} as const;

