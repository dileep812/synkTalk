import React from 'react';
import ActionButton from './ActionButton';

function ConnectionActions({
  targetUser,
  actionLoadingKey,
  runAction,
  removeConnectionRequest,
  sendConnectionRequest,
  withdrawConnectionRequest,
  handleConnectionRequest
}) {
  const relationship = targetUser.relationship || { status: 'none', requestId: null, amISender: false };
  const userKey = targetUser._id || targetUser.id || targetUser.email;
  const targetId = targetUser._id || targetUser.id;

  if (relationship.status === 'none') {
    return (
      <ActionButton
        type="button"
        onClick={() => runAction(`connect-${userKey}`, 'sendConnectionRequest', targetId, () => sendConnectionRequest(targetId))}
        disabled={!!actionLoadingKey}
        className="!w-auto px-4 py-2"
      >
        {actionLoadingKey === `connect-${userKey}` ? 'Connecting...' : 'Connect'}
      </ActionButton>
    );
  }

  if (relationship.status === 'pending' && relationship.amISender) {
    return (
      <ActionButton
        type="button"
        variant="secondary"
        onClick={() => runAction(`withdraw-${relationship.requestId}`, 'withdrawConnectionRequest', targetId, () => withdrawConnectionRequest(relationship.requestId))}
        disabled={!!actionLoadingKey}
        className="!w-auto px-4 py-2"
      >
        {actionLoadingKey === `withdraw-${relationship.requestId}` ? 'Withdrawing...' : 'Withdraw'}
      </ActionButton>
    );
  }

  if (relationship.status === 'pending' && !relationship.amISender) {
    return (
      <div className="flex gap-2">
        <ActionButton
          type="button"
          onClick={() =>
            runAction(`accept-${relationship.requestId}`, 'handleConnectionRequest_Accept', targetId, () =>
              handleConnectionRequest({ requestId: relationship.requestId, action: 'accepted' }),
            )
          }
          disabled={!!actionLoadingKey}
          className="!w-auto px-4 py-2"
        >
          {actionLoadingKey === `accept-${relationship.requestId}` ? 'Accepting...' : 'Accept'}
        </ActionButton>
        <ActionButton
          type="button"
          variant="secondary"
          onClick={() =>
            runAction(`reject-${relationship.requestId}`, 'handleConnectionRequest_Reject', targetId, () =>
              handleConnectionRequest({ requestId: relationship.requestId, action: 'rejected' }),
            )
          }
          disabled={!!actionLoadingKey}
          className="!w-auto px-4 py-2"
        >
          {actionLoadingKey === `reject-${relationship.requestId}` ? 'Rejecting...' : 'Reject'}
        </ActionButton>
      </div>
    );
  }

  if (relationship.status === 'accepted') {
    return (
      <ActionButton
        type="button"
        variant="secondary"
        onClick={() => runAction(`remove-${targetId}`, 'removeConnectionRequest', targetId, () => removeConnectionRequest(targetId))}
        disabled={!!actionLoadingKey}
        className="!w-auto px-4 py-2"
      >
        {actionLoadingKey === `remove-${targetId}` ? 'Removing...' : 'Remove'}
      </ActionButton>
    );
  }

  return <p className="text-sm font-semibold text-emerald-700">Connected ✓</p>;
}

export default ConnectionActions;
