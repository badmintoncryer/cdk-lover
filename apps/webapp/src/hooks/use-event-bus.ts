'use client';

import { Amplify } from 'aws-amplify';
import { events } from 'aws-amplify/data';
import { useEffect, useRef } from 'react';

const endpoint = process.env.NEXT_PUBLIC_EVENT_HTTP_ENDPOINT;
const apiKey = process.env.NEXT_PUBLIC_EVENT_API_KEY;

if (endpoint && apiKey) {
  Amplify.configure({
    API: {
      Events: {
        endpoint: `${endpoint}/event`,
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        defaultAuthMode: 'apiKey',
        apiKey,
      },
    },
  });
}

type UseEventBusProps = {
  channelName: string;
  onReceived: (payload: unknown) => void;
};

/** Subscribes to `event-bus/<channelName>`. No-op when the Event API is not configured (local dev). */
export const useEventBus = ({ channelName, onReceived }: UseEventBusProps) => {
  const onReceivedRef = useRef(onReceived);
  useEffect(() => {
    onReceivedRef.current = onReceived;
  }, [onReceived]);

  useEffect(() => {
    if (!endpoint || !apiKey) return;
    let closed = false;
    const pr = events
      .connect(`event-bus/${channelName}`)
      .then((channel) => {
        if (closed) {
          channel.close();
          return channel;
        }
        channel.subscribe({
          next: (data) => onReceivedRef.current(data),
          error: (err) => console.error('event bus error', err),
        });
        return channel;
      })
      .catch((err) => {
        console.error('event bus connect failed', err);
        return undefined;
      });

    return () => {
      closed = true;
      void pr.then((channel) => channel?.close());
    };
  }, [channelName]);
};
