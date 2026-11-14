// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TicketChain
 * @notice Educational ticket registry supporting issuance, controlled transfers,
 *         atomic single-use check-in, and cancellation on a local EVM network.
 */
contract TicketChain is AccessControl, ReentrancyGuard {
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant GATE_ROLE = keccak256("GATE_ROLE");

    enum TicketStatus {
        None,
        Active,
        Used,
        Cancelled
    }

    struct EventInfo {
        uint256 eventId;
        address organizer;
        uint256 capacity;
        uint256 issuedCount;
        uint256 entryDeadline;
        bool transferable;
        bool active;
    }

    struct TicketInfo {
        uint256 ticketId;
        uint256 eventId;
        address holder;
        TicketStatus status;
    }

    uint256 private _nextEventId = 1;
    uint256 private _nextTicketId = 1;

    mapping(uint256 => EventInfo) public events;
    mapping(uint256 => TicketInfo) public tickets;

    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        uint256 capacity,
        uint256 entryDeadline,
        bool transferable
    );
    event TicketIssued(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        address indexed holder
    );
    event TicketTransferred(
        uint256 indexed ticketId,
        address indexed from,
        address indexed to
    );
    event TicketCheckedIn(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        address indexed gate
    );
    event TicketCancelled(
        uint256 indexed ticketId,
        uint256 indexed eventId
    );

    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function createEvent(
        uint256 capacity,
        uint256 entryDeadline,
        bool transferable
    ) external onlyRole(ORGANIZER_ROLE) returns (uint256) {
        require(capacity > 0, "Capacity must be positive");
        require(entryDeadline > block.timestamp, "Deadline must be in the future");

        uint256 eventId = _nextEventId++;
        events[eventId] = EventInfo({
            eventId: eventId,
            organizer: msg.sender,
            capacity: capacity,
            issuedCount: 0,
            entryDeadline: entryDeadline,
            transferable: transferable,
            active: true
        });

        emit EventCreated(eventId, msg.sender, capacity, entryDeadline, transferable);
        return eventId;
    }

    function issueTicket(
        uint256 eventId,
        address holder
    ) external onlyRole(ORGANIZER_ROLE) nonReentrant returns (uint256) {
        EventInfo storage ev = events[eventId];
        require(ev.active, "Event does not exist or is inactive");
        require(ev.organizer == msg.sender, "Not event organizer");
        require(holder != address(0), "Invalid holder address");
        require(ev.issuedCount < ev.capacity, "Event capacity reached");

        uint256 ticketId = _nextTicketId++;
        ev.issuedCount += 1;

        tickets[ticketId] = TicketInfo({
            ticketId: ticketId,
            eventId: eventId,
            holder: holder,
            status: TicketStatus.Active
        });

        emit TicketIssued(ticketId, eventId, holder);
        return ticketId;
    }

    function transferTicket(
        uint256 ticketId,
        address newHolder
    ) external nonReentrant {
        TicketInfo storage ticket = tickets[ticketId];
        require(ticket.status == TicketStatus.Active, "Ticket is not active");
        require(ticket.holder == msg.sender, "Caller is not ticket holder");
        require(newHolder != address(0) && newHolder != msg.sender, "Invalid new holder");

        EventInfo storage ev = events[ticket.eventId];
        require(ev.transferable, "Transfers disabled for this event");
        require(block.timestamp <= ev.entryDeadline, "Event entry window closed");

        address previousHolder = ticket.holder;
        ticket.holder = newHolder;

        emit TicketTransferred(ticketId, previousHolder, newHolder);
    }

    function checkIn(uint256 ticketId) external onlyRole(GATE_ROLE) nonReentrant {
        TicketInfo storage ticket = tickets[ticketId];
        require(ticket.status == TicketStatus.Active, "Ticket is not active");

        EventInfo storage ev = events[ticket.eventId];
        require(ev.active, "Event inactive");
        require(block.timestamp <= ev.entryDeadline, "Entry deadline passed");

        // Atomic state transition prevents double check-in across concurrent scanners
        ticket.status = TicketStatus.Used;

        emit TicketCheckedIn(ticketId, ticket.eventId, msg.sender);
    }

    function cancelTicket(uint256 ticketId) external onlyRole(ORGANIZER_ROLE) {
        TicketInfo storage ticket = tickets[ticketId];
        require(ticket.status == TicketStatus.Active, "Only active ticket can be cancelled");

        EventInfo storage ev = events[ticket.eventId];
        require(ev.organizer == msg.sender, "Not event organizer");

        ticket.status = TicketStatus.Cancelled;

        emit TicketCancelled(ticketId, ticket.eventId);
    }

    function getStatus(
        uint256 ticketId
    ) external view returns (uint256 eventId, address holder, TicketStatus status) {
        TicketInfo storage ticket = tickets[ticketId];
        return (ticket.eventId, ticket.holder, ticket.status);
    }
}