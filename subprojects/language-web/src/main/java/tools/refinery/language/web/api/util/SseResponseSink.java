/*
 * SPDX-FileCopyrightText: 2025 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.language.web.api.util;

import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import org.eclipse.jetty.io.EofException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.refinery.language.web.api.dto.RefineryResponse;
import tools.refinery.language.web.api.dto.StatusUpdate;

import java.util.concurrent.*;

public class SseResponseSink implements ResponseSink {
	private static final Logger LOG = LoggerFactory.getLogger(SseResponseSink.class);

	private final SseEventSink eventSink;
	private final Sse sse;

	public SseResponseSink(SseEventSink eventSink, Sse sse) {
		this.eventSink = eventSink;
		this.sse = sse;
	}

	@Override
	public void setResponse(int ignoredStatusCode, RefineryResponse response) {
		LOG.debug("Worker returned result");
		if (isCancelled()) {
			return;
		}
		try {
			eventSink.send(sse.newEventBuilder()
							.mediaType(MediaType.APPLICATION_JSON_TYPE)
							.data(response)
							.build())
					.toCompletableFuture()
					.join();
			eventSink.send(sse.newEvent("[DONE]"))
					.toCompletableFuture()
					.join();
		} catch (CompletionException e) {
			if (e.getCause() instanceof EofException) {
				// Ignore exception, since the client has already disconnected.
				return;
			}
			throw e;
		}
	}

	@Override
	public void updateStatus(String status) {
		LOG.debug("Worker status update: {}", status);
		if (isCancelled()) {
			return;
		}
		try {
			eventSink.send(sse.newEventBuilder()
							.mediaType(MediaType.APPLICATION_JSON_TYPE)
							.data(new StatusUpdate(status))
							.build())
					.toCompletableFuture()
					.join();
		} catch (CompletionException e) {
			if (e.getCause() instanceof EofException) {
				// Ignore exception, since the client has already disconnected.
				return;
			}
			throw e;
		}
	}

	@Override
	public boolean isCancelled() {
		return eventSink.isClosed();
	}

	public void loop(Future<?> future) throws InterruptedException {
		while (!future.isDone() && !future.isCancelled()) {
			boolean finished;
			try {
				future.get(1, TimeUnit.SECONDS);
				finished = true;
			} catch (ExecutionException e) {
				// This should never happen, because the worker will handle its own exceptions.
				LOG.error("Uncaught exception in worker", e);
				finished = true;
			} catch (TimeoutException e) {
				finished = false;
			}
			if (finished) {
				break;
			}
			LOG.trace("Sending SSE heartbeat");
			try {
				// Send and empty comment to check whether the client is still connected. See
				// https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format
				eventSink.send(sse.newEventBuilder()
								.comment("")
								.build())
						.toCompletableFuture()
						.join();
			} catch (CompletionException e) {
				if (e.getCause() instanceof EofException) {
					LOG.debug("Client has disconnected, cancelling worker");
					// The client has disconnected.
					eventSink.close();
					future.cancel(true);
				} else {
					throw e;
				}
			}
		}
		eventSink.close();
	}
}
