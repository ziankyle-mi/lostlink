import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import WebSocket from "ws";

async function main() {
  console.log("1. Authenticating as admin/user via devLogin...");
  const devRes = await fetch("http://localhost:4321/_actions/devLogin", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "email=zian.piangco%40dlsau.edu.ph&next=%2F",
  });

  const rawCookie = devRes.headers.get("set-cookie") || "";
  console.log("Set-Cookie header received:", rawCookie.substring(0, 60) + "...");
  
  // Extract ll_dev_session
  const match = rawCookie.match(/ll_dev_session=([^;]+)/);
  const devSessionVal = match ? match[1] : "";

  const chromePath = path.resolve("node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
  console.log("2. Launching chrome-headless-shell on port 9222...");
  const chrome = spawn(chromePath, [
    "--headless",
    "--remote-debugging-port=9222",
    "--window-size=1920,1080",
    "--hide-scrollbars",
    "about:blank",
  ]);

  // Wait 1.5s for chrome to start
  await new Promise((r) => setTimeout(r, 1500));

  try {
    const listRes = await fetch("http://127.0.0.1:9222/json");
    const pages = await listRes.json();
    const wsUrl = pages[0].webSocketDebuggerUrl;
    console.log("3. Connecting CDP websocket:", wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.once("open", resolve));

    let id = 1;
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const msgId = id++;
        const handler = (data) => {
          const parsed = JSON.parse(data.toString());
          if (parsed.id === msgId) {
            ws.off("message", handler);
            resolve(parsed.result);
          }
        };
        ws.on("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });

    await send("Page.enable");
    await send("Network.enable");

    // Set cookie
    if (devSessionVal) {
      await send("Network.setCookie", {
        name: "ll_dev_session",
        value: devSessionVal,
        domain: "localhost",
        path: "/",
      });
      await send("Network.setCookie", {
        name: "ll_last_active",
        value: String(Date.now()),
        domain: "localhost",
        path: "/",
      });
    }

    // Set viewport 1920x1080
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const takeShot = async (url, outPath, waitMs = 2500) => {
      console.log(`Navigating to ${url}...`);
      await send("Page.navigate", { url });
      await new Promise((r) => setTimeout(r, waitMs));
      const shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
      console.log(`Saved screenshot to ${outPath} (${fs.statSync(outPath).size} bytes)`);
    };

    // Capture Campus Feed
    await takeShot("http://localhost:4321/", "assets/screen_dashboard.png");

    // Open Report Modal by clicking Post an item or button
    try {
      await send("Runtime.evaluate", {
        expression: `
          (function() {
            const btn = document.querySelector('button[data-open-report="found"]') || document.querySelector('a[href="#report"]') || document.querySelector('button.bg-forest-700');
            if (btn) btn.click();
            const modal = document.getElementById('report-modal-backdrop');
            if (modal) {
              modal.classList.remove('hidden');
              modal.style.display = 'flex';
              modal.style.opacity = '1';
            }
          })()
        `,
      });
      await new Promise((r) => setTimeout(r, 1200));
      const modalShot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync("assets/screen_report_modal.png", Buffer.from(modalShot.data, "base64"));
      fs.writeFileSync("public/assets/screen_report_modal.png", Buffer.from(modalShot.data, "base64"));
      console.log("Saved screenshot to assets/screen_report_modal.png");
    } catch (e) {
      console.warn("Could not capture modal:", e);
    }

    // Capture Admin Console
    await takeShot("http://localhost:4321/admin", "assets/screen_admin.png", 3000);

    // Capture Users Tab in Admin
    await takeShot("http://localhost:4321/admin?tab=users", "assets/screen_admin_users.png", 2500);

    ws.close();
  } finally {
    chrome.kill();
    console.log("Chrome closed successfully.");
  }
}

main().catch(console.error);
