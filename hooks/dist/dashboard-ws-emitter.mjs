var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/dashboard-ws-emitter.ts
import { readFileSync } from "fs";
function extractAgentInfo(input) {
  const ti = input.tool_input;
  if (input.tool_name === "Agent" || input.tool_name === "Task") {
    const agentType = ti.subagent_type || ti.type || "unknown";
    const prompt = ti.description || ti.prompt || "";
    const promptSummary = typeof prompt === "string" ? prompt.slice(0, 120) : "";
    const hasResponse = input.tool_response !== void 0 && input.tool_response !== null;
    const responseStr = typeof input.tool_response === "string" ? input.tool_response : JSON.stringify(input.tool_response || "");
    const hasError = responseStr.toLowerCase().includes("error") || responseStr.toLowerCase().includes("fail");
    let status = "running";
    let type = "agent_spawn";
    if (hasResponse && hasError) {
      status = "error";
      type = "agent_error";
    } else if (hasResponse) {
      status = "done";
      type = "agent_complete";
    }
    return {
      type,
      agentType,
      status,
      metadata: {
        promptSummary,
        responseLength: responseStr.length
      }
    };
  }
  if (input.tool_name === "Bash") {
    const cmd = (ti.command || "").slice(0, 200);
    const responseStr = typeof input.tool_response === "string" ? input.tool_response : JSON.stringify(input.tool_response || "");
    const hasError = responseStr.includes("Error") || responseStr.includes("error:") || responseStr.includes("FAIL");
    return {
      type: "tool_call",
      status: hasError ? "error" : "done",
      metadata: { tool: "Bash", command: cmd }
    };
  }
  return {
    type: "tool_call",
    status: "done",
    metadata: {
      tool: input.tool_name,
      detail: JSON.stringify(input.tool_input).slice(0, 150)
    }
  };
}
function sendToWebSocket(event) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(event);
    const postData = Buffer.from(payload);
    const req = __require("http").request(
      {
        hostname: "127.0.0.1",
        port: 3847,
        path: "/event",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": postData.length
        },
        timeout: 500
      },
      () => resolve()
    );
    req.on("error", () => resolve());
    req.on("timeout", () => {
      req.destroy();
      resolve();
    });
    req.write(postData);
    req.end();
  });
}
async function main() {
  let raw = "";
  try {
    raw = readFileSync(0, "utf-8");
  } catch {
    return;
  }
  if (!raw) {
    console.log("{}");
    return;
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    console.log("{}");
    return;
  }
  const interestingTools = ["Agent", "Task", "Bash", "Edit", "Write", "Read", "Grep", "Glob"];
  if (!interestingTools.includes(input.tool_name)) {
    console.log("{}");
    return;
  }
  const partial = extractAgentInfo(input);
  const event = {
    type: partial.type || "tool_call",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    sessionId: (input.session_id || "unknown").slice(0, 8),
    agentType: partial.agentType || void 0,
    agentId: process.env.CLAUDE_AGENT_ID || void 0,
    status: partial.status || "done",
    metadata: partial.metadata || {}
  };
  await sendToWebSocket(event);
  console.log("{}");
}
main();
