const { ethers } = require("hardhat");

async function main() {
  const [admin, organizer, gate, buyer1, buyer2] = await ethers.getSigners();
  const statusLabels = ["None", "Active", "Used", "Cancelled"];

  console.log("=== 1. Deploying TicketChain Contract on Local Hardhat Network ===");
  const TicketChain = await ethers.getContractFactory("TicketChain");
  const contract = await TicketChain.deploy(admin.address);
  await contract.waitForDeployment();
  console.log("Contract deployed to:", await contract.getAddress());

  const ORGANIZER_ROLE = await contract.ORGANIZER_ROLE();
  const GATE_ROLE = await contract.GATE_ROLE();
  await contract.connect(admin).grantRole(ORGANIZER_ROLE, organizer.address);
  await contract.connect(admin).grantRole(GATE_ROLE, gate.address);
  console.log("Roles granted -> Organizer:", organizer.address, "| Gate:", gate.address);

  console.log("\n=== 2. Organizer Creates Event (Capacity: 1000, Transfers: Enabled) ===");
  const latestBlock = await ethers.provider.getBlock("latest");
  const entryDeadline = latestBlock.timestamp + 86400;
  await (await contract.connect(organizer).createEvent(1000, entryDeadline, true)).wait();
  console.log("Event #1 created successfully.");

  console.log("\n=== 3. Issuing Ticket #1 to Buyer 1 ===");
  await (await contract.connect(organizer).issueTicket(1, buyer1.address)).wait();
  let state = await contract.getStatus(1);
  console.log(`Ticket #1 -> Holder: ${state[1]} | Status: ${statusLabels[Number(state[2])]}`);

  console.log("\n=== 4. Controlled Transfer: Buyer 1 -> Buyer 2 ===");
  await (await contract.connect(buyer1).transferTicket(1, buyer2.address)).wait();
  state = await contract.getStatus(1);
  console.log(`Ticket #1 -> New Holder: ${state[1]} | Status: ${statusLabels[Number(state[2])]}`);

  console.log("\n=== 5. Gate Check-In (Atomic Active -> Used) ===");
  await (await contract.connect(gate).checkIn(1)).wait();
  state = await contract.getStatus(1);
  console.log(`Ticket #1 -> Holder: ${state[1]} | Status: ${statusLabels[Number(state[2])]}`);

  console.log("\n=== 6. Duplicate Entry Attempt (Must Fail) ===");
  try {
    await contract.connect(gate).checkIn(1);
  } catch (error) {
    console.log("Duplicate check-in blocked as expected:", error.message.split("\n")[0]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});