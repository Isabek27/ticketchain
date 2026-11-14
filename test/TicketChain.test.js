const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TicketChain Smart Contract", function () {
  async function deployFixture() {
    const [admin, organizer, gate, buyer1, buyer2, attacker] = await ethers.getSigners();
    const TicketChain = await ethers.getContractFactory("TicketChain");
    const contract = await TicketChain.deploy(admin.address);

    const ORGANIZER_ROLE = await contract.ORGANIZER_ROLE();
    const GATE_ROLE = await contract.GATE_ROLE();

    await contract.connect(admin).grantRole(ORGANIZER_ROLE, organizer.address);
    await contract.connect(admin).grantRole(GATE_ROLE, gate.address);

    const deadline = (await time.latest()) + 86400; // +24 hours
    return { contract, admin, organizer, gate, buyer1, buyer2, attacker, deadline };
  }

  it("1. Should create an event and issue an active ticket", async function () {
    const { contract, organizer, buyer1, deadline } = await deployFixture();

    await expect(contract.connect(organizer).createEvent(1000, deadline, true))
      .to.emit(contract, "EventCreated")
      .withArgs(1, organizer.address, 1000, deadline, true);

    await expect(contract.connect(organizer).issueTicket(1, buyer1.address))
      .to.emit(contract, "TicketIssued")
      .withArgs(1, 1, buyer1.address);

    const [eventId, holder, status] = await contract.getStatus(1);
    expect(eventId).to.equal(1);
    expect(holder).to.equal(buyer1.address);
    expect(status).to.equal(1); // TicketStatus.Active
  });

  it("2. Should enforce event capacity limits when issuing tickets", async function () {
    const { contract, organizer, buyer1, buyer2, deadline } = await deployFixture();

    await contract.connect(organizer).createEvent(1, deadline, true);
    await contract.connect(organizer).issueTicket(1, buyer1.address);

    await expect(
      contract.connect(organizer).issueTicket(1, buyer2.address)
    ).to.be.revertedWith("Event capacity reached");
  });

  it("3. Should allow holder to transfer an active ticket and revoke old holder rights", async function () {
    const { contract, organizer, buyer1, buyer2, deadline } = await deployFixture();

    await contract.connect(organizer).createEvent(100, deadline, true);
    await contract.connect(organizer).issueTicket(1, buyer1.address);

    await expect(contract.connect(buyer1).transferTicket(1, buyer2.address))
      .to.emit(contract, "TicketTransferred")
      .withArgs(1, buyer1.address, buyer2.address);

    const [, holder] = await contract.getStatus(1);
    expect(holder).to.equal(buyer2.address);

    await expect(
      contract.connect(buyer1).transferTicket(1, buyer1.address)
    ).to.be.revertedWith("Caller is not ticket holder");
  });

  it("4. Should block transfers if organizer disabled transfers for the event", async function () {
    const { contract, organizer, buyer1, buyer2, deadline } = await deployFixture();

    await contract.connect(organizer).createEvent(100, deadline, false);
    await contract.connect(organizer).issueTicket(1, buyer1.address);

    await expect(
      contract.connect(buyer1).transferTicket(1, buyer2.address)
    ).to.be.revertedWith("Transfers disabled for this event");
  });

  it("5. Should allow single atomic check-in and reject duplicate gate scans", async function () {
    const { contract, organizer, gate, buyer1, deadline } = await deployFixture();

    await contract.connect(organizer).createEvent(100, deadline, true);
    await contract.connect(organizer).issueTicket(1, buyer1.address);

    await expect(contract.connect(gate).checkIn(1))
      .to.emit(contract, "TicketCheckedIn")
      .withArgs(1, 1, gate.address);

    const [, , status] = await contract.getStatus(1);
    expect(status).to.equal(2); // TicketStatus.Used

    await expect(
      contract.connect(gate).checkIn(1)
    ).to.be.revertedWith("Ticket is not active");
  });

  it("6. Should allow organizer to cancel an active ticket and prevent entry", async function () {
    const { contract, organizer, gate, buyer1, deadline } = await deployFixture();

    await contract.connect(organizer).createEvent(100, deadline, true);
    await contract.connect(organizer).issueTicket(1, buyer1.address);

    await expect(contract.connect(organizer).cancelTicket(1))
      .to.emit(contract, "TicketCancelled")
      .withArgs(1, 1);

    const [, , status] = await contract.getStatus(1);
    expect(status).to.equal(3); // TicketStatus.Cancelled

    await expect(
      contract.connect(gate).checkIn(1)
    ).to.be.revertedWith("Ticket is not active");
  });

  it("7. Should reject unauthorized access to organizer and gate functions", async function () {
    const { contract, organizer, attacker, buyer1, deadline } = await deployFixture();

    await expect(
      contract.connect(attacker).createEvent(50, deadline, true)
    ).to.be.reverted;

    await contract.connect(organizer).createEvent(50, deadline, true);
    await contract.connect(organizer).issueTicket(1, buyer1.address);

    await expect(
      contract.connect(attacker).checkIn(1)
    ).to.be.reverted;
  });
});