import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const oracleAddr = process.env.ORACLE_ADDR!;

const FOMOFHE_DemoModule = buildModule("FOMOFHE_DemoModule", (m) => {
  const FOMOFHE_Demo = m.contract("FOMOFHE_Demo", [oracleAddr], {});
  return { FOMOFHE_Demo };
});

export default FOMOFHE_DemoModule;
