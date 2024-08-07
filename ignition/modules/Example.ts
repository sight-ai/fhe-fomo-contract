import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ExampleModule = buildModule("ExampleModule", (m) => {
  const oracleAddress = m.getParameter("oracleAddress");
  const Example = m.contract("Example", [oracleAddress]);
  return { Example };
});

export default ExampleModule;
