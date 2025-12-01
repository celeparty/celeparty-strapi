'use strict';

/**
 * Ticket Management Routes
 * Custom routes for ticket management API endpoints
 */

module.exports = [
  {
    method: 'GET',
    path: '/api/tickets/summary',
    handler: 'ticket.ticket-management.getTicketSummary',
    config: {
      auth: {
        strategies: ['users-permissions'],
        scope: ['api::ticket.ticket']
      }
    }
  },
  {
    method: 'GET',
    path: '/api/tickets/:ticketId/details',
    handler: 'ticket.ticket-management.getTicketDetails',
    config: {
      auth: {
        strategies: ['users-permissions'],
        scope: ['api::ticket-detail.ticket-detail']
      }
    }
  },
  {
    method: 'POST',
    path: '/api/tickets/scan',
    handler: 'ticket.ticket-management.scanTicket',
    config: {
      auth: {
        strategies: ['users-permissions']
      }
    }
  },
  {
    method: 'POST',
    path: '/api/tickets/:ticketDetailId/verify',
    handler: 'ticket.ticket-management.verifyTicket',
    config: {
      auth: {
        strategies: ['users-permissions'],
        scope: ['api::ticket-detail.ticket-detail']
      }
    }
  },
  {
    method: 'GET',
    path: '/api/tickets/:ticketDetailId/verification-history',
    handler: 'ticket.ticket-management.getVerificationHistory',
    config: {
      auth: {
        strategies: ['users-permissions'],
        scope: ['api::ticket-verification.ticket-verification']
      }
    }
  },
  {
    method: 'POST',
    path: '/api/tickets/send-invitation',
    handler: 'ticket.ticket-management.sendInvitation',
    config: {
      auth: {
        strategies: ['users-permissions'],
        scope: ['api::ticket-detail.ticket-detail']
      }
    }
  },
  {
    method: 'GET',
    path: '/api/tickets/send-history',
    handler: 'ticket.ticket-management.getSendHistory',
    config: {
      auth: {
        strategies: ['users-permissions'],
        scope: ['api::ticket-send-history.ticket-send-history']
      }
    }
  }
];
