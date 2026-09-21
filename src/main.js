import "./style.css";

const app = document.querySelector("#app");

const exhibits = [
  { id: "01", name: "青铜太阳轮", era: "三星堆文化 · 约公元前 1200 年", tag: "镇馆之宝", color: "amber" },
  { id: "02", name: "云纹玉璧", era: "战国 · 公元前 475—221 年", tag: "玉器展", color: "teal" },
  { id: "03", name: "行旅山水图", era: "明代 · 十六世纪", tag: "书画展", color: "rose" },
];

const state = {
  agent: null,
  activeExhibit: exhibits[0],
  listening: false,
  layoutObserver: null,
  messages: [{ role: "guide", text: "你好，我是云上博物馆的星河导览员。今天想从哪件展品开始？" }],
};

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand-lockup"><span class="brand-mark">M</span><div><strong>云上博物馆</strong><small>YUNSHANG MUSEUM</small></div></div>
      <div class="topbar-meta"><span class="live-dot"></span><span>开放中</span><span class="divider"></span><span>第 01 展厅 · 青铜与文明</span></div>
      <button class="icon-button" id="help-button" aria-label="帮助">?</button>
    </header>
    <section class="hero-grid">
      <div class="avatar-stage">
        <div class="stage-grid"></div>
        <div class="stage-label"><span class="status-pill" id="agent-status">演示模式</span><span id="stage-caption">星河 · 博物馆导览员</span></div>
        <div class="avatar-shell"><div id="avatar-container"></div><div class="avatar-placeholder" id="avatar-placeholder"><div class="placeholder-orbit"><span class="orbit-dot"></span></div><div class="placeholder-avatar">星河</div><p>配置魔珐星云凭证后<br />这里会显示实时 3D 数字人</p></div></div>
        <div class="stage-caption-bottom"><span>实时具身交互</span><span class="caption-line"></span><span>WebGL</span></div>
      </div>
      <aside class="guide-panel">
        <div class="panel-heading"><div><span class="eyebrow">YOUR DIGITAL DOCENT</span><h1>今天，<em>一起看懂</em>一件文物。</h1></div><span class="panel-number">01</span></div>
        <p class="intro">你可以直接问我年代、工艺、故事，也可以点击下方展品开始一段定制讲解。</p>
        <div class="conversation" id="conversation" aria-live="polite"></div>
        <div class="quick-prompts" id="quick-prompts"><button data-prompt="请介绍一下这件展品">介绍这件展品 <span>↗</span></button><button data-prompt="它为什么重要？">它为什么重要？ <span>↗</span></button><button data-prompt="带我看看下一件">带我看看下一件 <span>↗</span></button></div>
        <form class="composer" id="composer"><input id="message-input" autocomplete="off" placeholder="问问星河关于展品的任何事…" /><button type="button" class="mic-button" id="mic-button" aria-label="开始语音识别">◉</button><button type="submit" class="send-button" aria-label="发送">↑</button></form>
        <div class="interaction-note"><span class="sound-wave"><i></i><i></i><i></i><i></i></span><span id="interaction-status">支持文字对话 · 接入 SDK 后支持语音聆听与打断</span></div>
      </aside>
    </section>
    <section class="exhibit-section"><div class="section-heading"><div><span class="eyebrow">CURATED FOR YOU</span><h2>本展厅精选</h2></div><span class="section-note">选择一件，开始探索 <span>→</span></span></div><div class="exhibit-list" id="exhibit-list"></div></section>
    <footer><span>云上博物馆 · 具身智能导览实验</span><span>Powered by 魔珐星云 XmovAvatar</span></footer>
  </main>
`;

const conversation = document.querySelector("#conversation");
const input = document.querySelector("#message-input");
const interactionStatus = document.querySelector("#interaction-status");
const agentStatus = document.querySelector("#agent-status");
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

function fitAvatarToStage() {
  const container = document.querySelector("#avatar-container");
  if (!state.agent?.changeLayout || !container) return;
  const { width, height } = container.getBoundingClientRect();
  if (!width || !height) return;
  state.agent.changeLayout({
    container: { size: [Math.round(width), Math.round(height)] },
    avatar: {
      h_align: "center",
      v_align: "center",
      scale: "92vh",
      offset_x: 0,
      offset_y: 10,
    },
  });
}

function renderMessages() {
  conversation.innerHTML = state.messages.map((message) => `
    <div class="message ${message.role === "user" ? "message-user" : "message-guide"}">
      ${message.role === "guide" ? '<span class="message-label">星河 · 导览员</span>' : ""}
      <p>${escapeHtml(message.text)}</p>
    </div>
  `).join("");
  conversation.scrollTop = conversation.scrollHeight;
}

function renderExhibits() {
  document.querySelector("#exhibit-list").innerHTML = exhibits.map((exhibit, index) => `
    <button class="exhibit-card ${index === 0 ? "selected" : ""}" data-id="${exhibit.id}">
      <span class="exhibit-index">${exhibit.id}</span><span class="exhibit-art art-${exhibit.color}"><span></span></span>
      <span class="exhibit-copy"><strong>${exhibit.name}</strong><small>${exhibit.era}</small><em>${exhibit.tag}</em></span><span class="card-arrow">↗</span>
    </button>
  `).join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function demoReply(question) {
  const name = state.activeExhibit.name;
  if (question.includes("下一件")) {
    const currentIndex = exhibits.findIndex((item) => item.id === state.activeExhibit.id);
    const next = exhibits[(currentIndex + 1) % exhibits.length];
    selectExhibit(next.id);
    return `我们移步到「${next.name}」。它属于${next.era}，你可以先观察它的纹样和材质。`;
  }
  if (question.includes("重要")) return `「${name}」不只是一件器物，它还记录了当时人们对秩序、信仰与自然的理解。想知道它的制作工艺吗？`;
  return `这是「${name}」，${state.activeExhibit.era}。它最吸引人的地方，是把当时的工艺、审美和生活方式留在了一件可以被我们今天继续观察的作品里。`;
}

async function askGuide(question) {
  const trimmed = question.trim();
  if (!trimmed) return;
  state.messages.push({ role: "user", text: trimmed });
  renderMessages();
  input.value = "";
  interactionStatus.textContent = "星河正在思考…";
  try {
    if (state.agent) {
      await state.agent.ask(trimmed);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500));
      state.messages.push({ role: "guide", text: demoReply(trimmed) });
    }
  } catch (error) {
    state.messages.push({ role: "guide", text: "刚才的连接有些不稳定，我先用展厅资料为你继续讲解。" });
    console.error(error);
  }
  renderMessages();
  interactionStatus.textContent = state.agent ? "实时具身交互已连接" : "演示模式 · 配置 SDK 后启用语音与动作";
}

function selectExhibit(id) {
  const exhibit = exhibits.find((item) => item.id === id);
  if (!exhibit) return;
  state.activeExhibit = exhibit;
  document.querySelectorAll(".exhibit-card").forEach((card) => card.classList.toggle("selected", card.dataset.id === id));
  document.querySelector("#stage-caption").textContent = `星河 · 正在讲解「${exhibit.name}」`;
}

async function initXmovAgent() {
  if (!window.isSecureContext && !isLocalHost) {
    agentStatus.textContent = "移动端预览";
    interactionStatus.textContent = "当前为 HTTP · 数字人与语音将在 HTTPS 环境启用";
    return;
  }
  let runtimeConfig;
  try {
    const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
    runtimeConfig = await response.json();
  } catch (error) {
    console.error("后端配置加载失败", error);
    agentStatus.textContent = "服务未连接";
    interactionStatus.textContent = "后端服务暂不可用 · 当前使用演示模式";
    return;
  }

  const script = document.createElement("script");
  script.src = "https://media.xingyun3d.com/xingyun3d/general/litesdk/xmovAvatar_e2e@latest.js";
  script.crossOrigin = "anonymous";
  script.fetchPriority = "high";
  script.onload = async () => {
    try {
      state.agent = new window.XingyunAvatarAgent({
        container: document.querySelector("#avatar-container"),
        appId: runtimeConfig.appId,
        appSecret: "server-managed",
        gatewayServer: runtimeConfig.gatewayServer,
        onMessage(error) { console.error("渲染错误", error.code, error.message); },
        agentCallbacks: {
          onAgentStateChange(status) { agentStatus.textContent = status === "running" ? "已连接" : status; },
          onASRResult(result) { if (result.isFinal) input.value = result.text; },
          onError(error) { console.error("Agent 错误", error.code, error.message); },
        },
      });
      await state.agent.init({ onDownloadProgress(progress) { interactionStatus.textContent = `正在加载数字人 ${progress.toFixed(0)}%`; } });
      fitAvatarToStage();
      state.layoutObserver = new ResizeObserver(() => requestAnimationFrame(fitAvatarToStage));
      state.layoutObserver.observe(document.querySelector("#avatar-container"));
      agentStatus.textContent = "已连接";
      document.querySelector("#avatar-placeholder").classList.add("is-hidden");
      interactionStatus.textContent = "实时具身交互已连接";
    } catch (error) {
      console.error("初始化失败", error);
      agentStatus.textContent = "演示模式";
    }
  };
  script.onerror = () => { interactionStatus.textContent = "SDK 加载失败 · 当前使用演示模式"; };
  document.head.appendChild(script);
}

document.querySelector("#composer").addEventListener("submit", (event) => { event.preventDefault(); void askGuide(input.value); });
document.querySelectorAll("#quick-prompts button").forEach((button) => button.addEventListener("click", () => void askGuide(button.dataset.prompt)));
document.querySelector("#exhibit-list").addEventListener("click", (event) => { const card = event.target.closest(".exhibit-card"); if (card) selectExhibit(card.dataset.id); });
document.querySelector("#mic-button").addEventListener("click", async () => {
  if (!state.agent) { interactionStatus.textContent = "配置魔珐星云凭证后即可使用语音聆听"; return; }
  try { state.listening = !state.listening; state.listening ? await state.agent.startASR() : await state.agent.stopASR(); interactionStatus.textContent = state.listening ? "正在聆听…再次点击结束" : "实时具身交互已连接"; } catch (error) { console.error(error); }
});

window.addEventListener("beforeunload", () => {
  state.layoutObserver?.disconnect();
  void state.agent?.destroy("page_unload");
});

renderMessages();
renderExhibits();
void initXmovAgent();
