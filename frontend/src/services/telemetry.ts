import { API_BASE_URL } from "./api";

export function connectTelemetry(
  onData: (data: any) => void,
  onStatus: (status: "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DISCONNECTED") => void,
) {
  const wsUrl = API_BASE_URL.replace(/^http/, "ws") + "/ws/stream";
  let socket: WebSocket;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const connect = () => {
    if (stopped) return;
    onStatus("CONNECTING");
    socket = new WebSocket(wsUrl);

    socket.onopen = () => onStatus("CONNECTED");
    socket.onmessage = (event) => {
      try { onData(JSON.parse(event.data)); } catch (error) { console.error("Invalid telemetry packet", error); }
    };
    socket.onerror = () => onStatus("DISCONNECTED");
    socket.onclose = () => {
      if (stopped) return;
      onStatus("RECONNECTING");
      reconnectTimer = setTimeout(connect, 1500);
    };
  };

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
