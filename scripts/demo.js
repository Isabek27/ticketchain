const { ethers } = require("hardhat");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const [admin, organizer, gate, buyer1, buyer2] = await ethers.getSigners();
  const statusLabels = ["None", "Active", "Used", "Cancelled"];

  console.log("=================================================================");
  console.log("[STEP 1/6] DEPLOYING TICKETCHAIN SMART CONTRACT (LOCAL HARDHAT)");
  console.log("=================================================================");
  const TicketChain = await ethers.getContractFactory("TicketChain");
  const contract = await TicketChain.deploy(admin.address);
  await contract.waitForDeployment();
  console.log("Contract Address :", await contract.getAddress());

  const ORGANIZER_ROLE = await contract.ORGANIZER_ROLE();
  const GATE_ROLE = await contract.GATE_ROLE();
  await contract.connect(admin).grantRole(ORGANIZER_ROLE, organizer.address);
  await contract.connect(admin).grantRole(GATE_ROLE, gate.address);
  console.log("Organizer Account:", organizer.address);
  console.log("Gate Account     :", gate.address);
  await sleep(3500);

  console.log("\n=================================================================");
  console.log("[STEP 2/6] ORGANIZER CREATES EVENT (CAPACITY: 1000, TRANSFERS: ON)");
  console.log("=================================================================");
  const latestBlock = await ethers.provider.getBlock("latest");
  const entryDeadline = latestBlock.timestamp + 86400;
  await (await contract.connect(organizer).createEvent(1000, entryDeadline, true)).wait();
  console.log("Result           : Event #1 created on-chain.");
  await sleep(3500);

  console.log("\n=================================================================");
  console.log("[STEP 3/6] ISSUING TICKET #1 TO BUYER 1");
  console.log("=================================================================");
  await (await contract.connect(organizer).issueTicket(1, buyer1.address)).wait();
  let state = await contract.getStatus(1);
  console.log("Ticket ID        : #1");
  console.log("Current Holder   :", state[1]);
  console.log("Ticket Status    :", statusLabels[Number(state[2])]);
  await sleep(3500);

  console.log("\n=================================================================");
  console.log("[STEP 4/6] CONTROLLED PEER-TO-PEER TRANSFER (BUYER 1 -> BUYER 2)");
  console.log("=================================================================");
  await (await contract.connect(buyer1).transferTicket(1, buyer2.address)).wait();
  state = await contract.getStatus(1);
  console.log("New Holder       :", state[1]);
  console.log("Ticket Status    :", statusLabels[Number(state[2])]);
  await sleep(3500);

  console.log("\n=================================================================");
  console.log("[STEP 5/6] ATOMIC GATE CHECK-IN (ACTIVE -> USED)");
  console.log("=================================================================");
  await (await contract.connect(gate).checkIn(1)).wait();
  state = await contract.getStatus(1);
  console.log("Verified Holder  :", state[1]);
  console.log("Updated Status   :", statusLabels[Number(state[2])]);
  await sleep(3500);

  console.log("\n=================================================================");
  console.log("[STEP 6/6] DUPLICATE SCAN ATTEMPT AT SECOND GATE (MUST REVERT)");
  console.log("=================================================================");
  try {
    await contract.connect(gate).checkIn(1);
  } catch (error) {
    console.log("Security Check   : Blocked as expected!");
    console.log("Revert Reason    :", error.message.split("\n")[0]);
  }
  await sleep(3000);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});