Educational project for the course Introduction to Finance. Not a real product, service or investment offer. Do not use with real funds.

# TicketChain Prototype

Local EVM smart-contract prototype for verifiable event ticket issuance, controlled transfers, and atomic single-use entry verification.

## Demo Video
- Video link: `[PASTE_GOOGLE_DRIVE_LINK_HERE]`

## Contract Architecture
- **Platform design:** EVM-compatible smart contract built with Solidity `0.8.24` and OpenZeppelin (`AccessControl`, `ReentrancyGuard`).
- **Roles:**
  - `DEFAULT_ADMIN_ROLE`: manages organizer and gate permissions.
  - `ORGANIZER_ROLE`: creates events, issues tickets within event capacity, and cancels active tickets.
  - `GATE_ROLE`: performs atomic `Active -> Used` check-in at event entrances.
- **Core Functions:** `createEvent`, `issueTicket`, `transferTicket`, `checkIn`, `cancelTicket`, `getStatus`.

## How to Run Locally

1. Install dependencies:
```bash
npm install