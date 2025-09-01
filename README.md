# FHE Confidential Health

A demo dApp showing how **Fully Homomorphic Encryption (FHE)** on-chain can protect **sensitive health data** while still enabling computation and controlled access.

I’m an **AI engineer (new to smart-contract dev)**, starting a company to help medical researchers.  
A major blocker we see: **privacy constraints** prevent multi-center data pooling and standardization (e.g., **GDPR**), so valuable datasets stay siloed.

This project shows how **FHE + blockchain** helps:
- Patients submit **encrypted metrics**; the contract **computes over ciphertexts** (no raw values exposed).
- Patients can **decrypt their own score** locally.
- They can **grant decryption rights** to a doctor/researcher/insurer who needs the risk **signal** without the raw **PHI**.

---

## Health Score (simplified)

Inspired by the **Framingham Risk Score** (widely used to estimate **10-year cardiovascular risk** in clinical practice and by insurers),  
we use a **minimal surrogate** here to demonstrate **homomorphic computation and selective disclosure**.

---

## Features

- Encrypted patient metrics **stored on-chain**
- Contract computes **entirely over ciphertexts**
- Local decryption with the user’s **private key**
- **Selective access control** (grant decryption to specific addresses)
- GDPR-friendly: **no raw medical data revealed**

---

## Setup & Install

### Requirements
- Node.js 20+
- Hardhat
- MetaMask

### Install
```bash
git clone https://github.com/cozokim/fhe-confidential-health.git
cd fhe-confidential-health
npm install
```

Run Hardhat node
```bash
cd packages/fhevm-hardhat-template
npx hardhat node
# RPC: http://127.0.0.1:8545  | chainId: 31337
```

Deploy contracts (localhost)
```bash
npx hardhat deploy --network localhost --reset
```
Generate ABI for the frontend
```bash
cd ../site
npm run genabi
```

Run the frontend
```bash
npm run dev
# open http://localhost:3000
```

Add the Hardhat network in MetaMask (if needed)

    RPC URL: http://127.0.0.1:8545

    Chain ID: 31337

    Currency: ETH

How to Use

    Connect MetaMask (local Hardhat).

    Submit metrics → values are encrypted locally and sent on-chain.

    Get score handle → retrieve the encrypted result handle.

    Decrypt as patient → decrypt the score with your private key.

    Grant access → authorize another address (doctor/insurer).

    Switch account (doctor/insurer) → decrypt the score if authorized.

    Switch account (unauthorized) → will fail to decrypt (no access).

References

    [Zama FHEVM](https://docs.zama.ai/homepage/)

License

This project is licensed under the BSD-3-Clause-Clear License – see the LICENSE file for details.
