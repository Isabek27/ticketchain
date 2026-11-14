# TicketChain — Product Workflow & Regulatory Compliance (Kazakhstan / AIFC)

## 1. Stakeholder Roles & Ticket Lifecycle
- Organizer (`ORGANIZER_ROLE`): Creates events (createEvent), issues single-use tickets (issueTicket), and revokes refunded tickets (cancelTicket).
- Attendee (Ticket Holder): Receives a pseudonymous ticket ID and may transfer ownership (transferTicket) only if the event organizer enabled transfers before entryDeadline.
- Venue Gate Scanner (`GATE_ROLE`): Validates tickets at the entrance via checkIn, atomically transitioning status from Active to Used to block duplicate screenshots.

## 2. Venue Connectivity Fallback Protocol (Pending Verification)
If cellular or RPC connectivity drops at a venue entrance:
1. Gate scanners validate attendees against a pre-signed local event manifest and record check-ins under Pending Verification.
2. Immediately upon reconnection, queued gate scans are batch-reconciled on-chain to update ticket states to Used.

## 3. Kazakhstan & AIFC Compliance Controls
- Law of RK No. 193-VII ("On Digital Assets", 2023): TicketChain issues no native token or cryptocurrency; all B2B fees are settled strictly in KZT via licensed local payment gateways.
- AIFC Rules on Digital Asset Activities (AFSA): On-chain entries represent non-monetary single-use admission rights rather than financial instruments.
- Law of RK No. 94-V ("On Personal Data and Their Protection", 2013): All attendee personal data (names, contacts, payment receipts) is stored off-chain in encrypted databases hosted on servers inside Kazakhstan.
- Corporate & IP Governance: Planned incorporation as an LLP (ТОО) in Kazakhstan (eligible for Astana Hub preferences), 2-of-3 multisig admin governance, Qazpatent software copyright registration, and MIT license attribution for OpenZeppelin Contracts v5.1.
