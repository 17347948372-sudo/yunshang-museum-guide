import "./style.css";

const app = document.querySelector("#app");

const exhibits = [
  { id: "01", name: "谷纹兽面玉璧", era: "中国 · 玉（软玉）", tag: "礼制与宇宙", image: "/exhibits/jade-bi.jpg", position: "center" },
  { id: "02", name: "青铜礼器爵", era: "商末 · 公元前十一世纪", tag: "礼乐文明", image: "/exhibits/ritual-jue.jpg", position: "center 48%" },
  { id: "03", name: "青花加彩葫芦瓶", era: "中国 · 景德镇瓷器", tag: "瓷器工艺", image: "/exhibits/porcelain-vase.jpg", position: "center 45%" },
  { id: "04", name: "十二生肖陶俑", era: "唐代 · 八世纪", tag: "生肖文化", image: "/exhibits/zodiac-animals.jpg", position: "center 52%" },
  { id: "05", name: "四季山水图卷", era: "明代 · 1635 年", tag: "书画长卷", image: "/exhibits/four-seasons.jpg", position: "center" },
  { id: "06", name: "镇墓兽", era: "北魏至北齐 · 六世纪", tag: "墓葬艺术", image: "/exhibits/tomb-guardian.jpg", position: "center 48%" },
];

const state = {
  agent: null,
  activeExhibit: exhibits[0],
  listening: false,
  layoutObserver: null,
  carouselPage: 0,
  carouselTimer: null,
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
    <section class="exhibit-section">
      <div class="section-heading">
        <div><span class="eyebrow">OPEN COLLECTION</span><h2>本展厅精选</h2></div>
        <div class="carousel-heading-actions"><span class="section-note">大都会艺术博物馆开放馆藏</span><button class="carousel-button" id="carousel-prev" type="button" title="上一组展品" aria-label="上一组展品">←</button><button class="carousel-button" id="carousel-next" type="button" title="下一组展品" aria-label="下一组展品">→</button></div>
      </div>
      <div class="exhibit-carousel" id="exhibit-carousel"><div class="exhibit-track" id="exhibit-list"></div></div>
      <div class="carousel-footer"><div class="carousel-dots" id="carousel-dots" aria-label="展品轮播页"></div><span id="carousel-counter">01 / 06</span></div>
    </section>
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
      scale: "100vh",
      offset_x: 0,
      offset_y: 14,
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
    <button class="exhibit-card ${index === 0 ? "selected" : ""}" data-id="${exhibit.id}" aria-label="选择讲解${exhibit.name}">
      <span class="exhibit-image"><img src="${exhibit.image}" alt="${exhibit.name}" style="object-position:${exhibit.position}" ${index > 2 ? 'loading="lazy"' : ""} /></span>
      <span class="exhibit-meta"><span class="exhibit-index">${exhibit.id}</span><span class="source-label">THE MET · OPEN ACCESS</span></span>
      <span class="exhibit-copy"><strong>${exhibit.name}</strong><small>${exhibit.era}</small><em>${exhibit.tag}</em></span><span class="card-arrow">↗</span>
    </button>
  `).join("");
  updateCarousel();
}

function visibleExhibitCount() {
  if (window.innerWidth <= 620) return 1;
  if (window.innerWidth <= 1000) return 2;
  return 3;
}

function updateCarousel() {
  const track = document.querySelector("#exhibit-list");
  const cards = [...track.children];
  const visible = visibleExhibitCount();
  const pageCount = Math.ceil(exhibits.length / visible);
  state.carouselPage = Math.min(state.carouselPage, pageCount - 1);
  const target = cards[state.carouselPage * visible];
  track.style.transform = `translate3d(-${target?.offsetLeft || 0}px, 0, 0)`;
  document.querySelector("#carousel-dots").innerHTML = Array.from({ length: pageCount }, (_, index) => `
    <button type="button" class="carousel-dot ${index === state.carouselPage ? "active" : ""}" data-page="${index}" aria-label="查看第 ${index + 1} 组展品" aria-current="${index === state.carouselPage}"></button>
  `).join("");
  const firstVisible = state.carouselPage * visible + 1;
  document.querySelector("#carousel-counter").textContent = `${String(firstVisible).padStart(2, "0")} / ${String(exhibits.length).padStart(2, "0")}`;
}

function goToCarouselPage(page, restart = true) {
  const pageCount = Math.ceil(exhibits.length / visibleExhibitCount());
  state.carouselPage = (page + pageCount) % pageCount;
  updateCarousel();
  if (restart) startCarousel();
}

function startCarousel() {
  window.clearInterval(state.carouselTimer);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  state.carouselTimer = window.setInterval(() => goToCarouselPage(state.carouselPage + 1, false), 5200);
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
  startCarousel();
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
document.querySelector("#carousel-prev").addEventListener("click", () => goToCarouselPage(state.carouselPage - 1));
document.querySelector("#carousel-next").addEventListener("click", () => goToCarouselPage(state.carouselPage + 1));
document.querySelector("#carousel-dots").addEventListener("click", (event) => { const dot = event.target.closest(".carousel-dot"); if (dot) goToCarouselPage(Number(dot.dataset.page)); });
document.querySelector("#exhibit-carousel").addEventListener("pointerenter", () => window.clearInterval(state.carouselTimer));
document.querySelector("#exhibit-carousel").addEventListener("pointerleave", startCarousel);
document.querySelector("#exhibit-carousel").addEventListener("focusin", () => window.clearInterval(state.carouselTimer));
document.querySelector("#exhibit-carousel").addEventListener("focusout", startCarousel);
window.addEventListener("resize", updateCarousel);
document.querySelector("#mic-button").addEventListener("click", async () => {
  if (!state.agent) { interactionStatus.textContent = "配置魔珐星云凭证后即可使用语音聆听"; return; }
  try { state.listening = !state.listening; state.listening ? await state.agent.startASR() : await state.agent.stopASR(); interactionStatus.textContent = state.listening ? "正在聆听…再次点击结束" : "实时具身交互已连接"; } catch (error) { console.error(error); }
});

window.addEventListener("beforeunload", () => {
  state.layoutObserver?.disconnect();
  window.clearInterval(state.carouselTimer);
  void state.agent?.destroy("page_unload");
});

renderMessages();
renderExhibits();
startCarousel();
void initXmovAgent();
