import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MultiStepExampleModule = buildModule("MultiStepExampleModule", (m) => {
  const oracleAddress = m.getParameter("oracleAddress");
  const MultiStepExample = m.contract("MultiStepExample", [oracleAddress]);
  return { MultiStepExample };
});

export default MultiStepExampleModule;
