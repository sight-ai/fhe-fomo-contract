# Sight Fomo FHE Demo Hardhat Project

This project demonstrates a basic Sight Oracle use case. It comes with an example contract, a test for that contract,
and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
pnpm hardhat help
pnpm hardhat test
REPORT_GAS=true pnpm hardhat test
pnpm hardhat node
pnpm hardhat ignition deploy ./ignition/modules/Oracle.ts
ORACLE_ADDR=0x... pnpm hardhat ignition deploy ./ignition/modules/FOMOFHE_Demo.ts
```
