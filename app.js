const SUPABASE_URL = "https://qvvshrnjrzrqxnizqrpr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5tdEoxCncZWjh7UX1Rm4lQ_Ct4NRuf-";
const ADMIN_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/admin-users`;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  authMode: "login",
  session: null,
  profile: null,
  posts: [],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  authView: $("#authView"),
  appView: $("#appView"),
  authForm: $("#authForm"),
  authEmail: $("#authEmail"),
  authPassword: $("#authPassword"),
  authSubmitLabel: $("#authSubmitLabel"),
  authMessage: $("#authMessage"),
  sessionEmail: $("#sessionEmail"),
  sessionRole: $("#sessionRole"),
  logoutButton: $("#logoutButton"),
  refreshButton: $("#refreshButton"),
  postsList: $("#postsList"),
  postForm: $("#postForm"),
  postId: $("#postId"),
  postTitle: $("#postTitle"),
  postContent: $("#postContent"),
  postSubmitLabel: $("#postSubmitLabel"),
  postMessage: $("#postMessage"),
  cancelEditButton: $("#cancelEditButton"),
  viewTitle: $("#viewTitle"),
  adminCreateForm: $("#adminCreateForm"),
  adminEmail: $("#adminEmail"),
  adminPassword: $("#adminPassword"),
  adminRole: $("#adminRole"),
  adminMessage: $("#adminMessage"),
  profilesList: $("#profilesList"),
  loadProfilesButton: $("#loadProfilesButton"),
};

function setMessage(node, message, isError = false) {
  node.textContent = message;
  node.classList.toggle("error", isError);
}

function getAuthErrorMessage(error) {
  if (!error) return "인증 처리 중 오류가 발생했습니다.";
  if (error.message === "Invalid login credentials") {
    return "이메일 또는 비밀번호가 올바르지 않습니다. 처음이면 회원가입 탭을 눌러 가입해 주세요.";
  }
  if (error.message === "Email not confirmed") {
    return "Supabase Auth 설정에서 이메일 확인을 꺼주세요.";
  }
  return error.message;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function switchView(viewName) {
  $$(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${viewName}View`).classList.add("active");
  elements.viewTitle.textContent = {
    posts: "게시글",
    editor: elements.postId.value ? "글 수정" : "글쓰기",
    admin: "계정 관리",
  }[viewName];
}

function renderSession() {
  const isAuthed = Boolean(state.session);
  const isAdmin = state.profile?.role === "admin";

  document.body.classList.toggle("is-admin", isAdmin);
  elements.authView.hidden = isAuthed;
  elements.appView.hidden = !isAuthed;
  elements.logoutButton.hidden = !isAuthed;
  elements.sessionEmail.textContent = state.session?.user?.email || "로그인이 필요합니다";
  elements.sessionRole.textContent = state.profile?.role || "guest";

  if (!isAdmin && $("#adminView").classList.contains("active")) {
    switchView("posts");
  }
}

function renderPosts() {
  if (!state.posts.length) {
    elements.postsList.innerHTML = `<div class="empty-state">아직 게시글이 없습니다.</div>`;
    return;
  }

  elements.postsList.innerHTML = state.posts
    .map((post) => {
      const isMine = post.author_id === state.session?.user?.id;
      return `
        <article class="post-card">
          <div class="post-actions">
            <div>
              <h2>${escapeHtml(post.title)}</h2>
              <div class="post-meta">${escapeHtml(post.profiles?.email || "알 수 없음")} · ${formatDate(post.created_at)}</div>
            </div>
            ${
              isMine
                ? `<div class="button-row">
                    <button class="icon-button" title="수정" data-edit-post="${post.id}">
                      <i data-lucide="pencil"></i>
                    </button>
                    <button class="icon-button danger-button" title="삭제" data-delete-post="${post.id}">
                      <i data-lucide="trash-2"></i>
                    </button>
                  </div>`
                : ""
            }
          </div>
          <p>${escapeHtml(post.content)}</p>
        </article>
      `;
    })
    .join("");

  lucide.createIcons();
}

async function loadProfile() {
  if (!state.session) {
    state.profile = null;
    return;
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, email, role")
    .eq("id", state.session.user.id)
    .single();

  if (error) throw error;
  state.profile = data;
}

async function loadPosts() {
  const { data, error } = await supabaseClient
    .from("posts")
    .select("id, title, content, author_id, created_at, updated_at, profiles(email)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  state.posts = data || [];
  renderPosts();
}

async function loadProfiles() {
  setMessage(elements.adminMessage, "계정 목록을 불러오는 중입니다.");
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    setMessage(elements.adminMessage, error.message, true);
    return;
  }

  elements.profilesList.innerHTML = (data || [])
    .map((profile) => {
      const isSelf = profile.id === state.session.user.id;
      return `
        <div class="profile-row">
          <div>
            <strong>${escapeHtml(profile.email)}</strong>
            <span class="role-badge">${escapeHtml(profile.role)}</span>
          </div>
          <button class="icon-button danger-button" title="계정 삭제" data-delete-user="${profile.id}" ${isSelf ? "disabled" : ""}>
            <i data-lucide="user-x"></i>
          </button>
        </div>
      `;
    })
    .join("");
  setMessage(elements.adminMessage, "");
  lucide.createIcons();
}

async function callAdminFunction(action, payload) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData.session?.access_token;

  const response = await fetch(ADMIN_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "관리자 요청에 실패했습니다.");
  }
  return body;
}

function resetEditor() {
  elements.postId.value = "";
  elements.postTitle.value = "";
  elements.postContent.value = "";
  elements.postSubmitLabel.textContent = "게시";
  elements.cancelEditButton.hidden = true;
  setMessage(elements.postMessage, "");
}

async function bootstrap() {
  const { data } = await supabaseClient.auth.getSession();
  state.session = data.session;

  if (state.session) {
    await loadProfile();
    await loadPosts();
  }

  renderSession();
  lucide.createIcons();
}

$$("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.authMode = button.dataset.authMode;
    $$("[data-auth-mode]").forEach((item) => item.classList.toggle("active", item === button));
    elements.authSubmitLabel.textContent = state.authMode === "login" ? "로그인" : "회원가입";
    setMessage(elements.authMessage, "");
  });
});

$$(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(elements.authMessage, "처리 중입니다.");

  try {
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;
    const authCall =
      state.authMode === "login"
        ? supabaseClient.auth.signInWithPassword({ email, password })
        : supabaseClient.auth.signUp({ email, password });

    const { data, error } = await authCall;
    if (error) {
      setMessage(elements.authMessage, getAuthErrorMessage(error), true);
      return;
    }

    state.session = data.session;
    if (!state.session) {
      setMessage(elements.authMessage, "Supabase Auth 설정에서 이메일 확인을 꺼주세요.");
      return;
    }

    await loadProfile();
    await loadPosts();
    renderSession();
    switchView("posts");
    setMessage(elements.authMessage, "");
    alert(state.authMode === "login" ? "로그인되었습니다." : "회원가입 및 로그인되었습니다.");
  } catch (error) {
    setMessage(elements.authMessage, `로그인 후 데이터 로딩 실패: ${error.message}`, true);
  }
});

elements.logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  state.session = null;
  state.profile = null;
  state.posts = [];
  renderSession();
  resetEditor();
});

elements.refreshButton.addEventListener("click", loadPosts);

elements.postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(elements.postMessage, "저장 중입니다.");

  const payload = {
    title: elements.postTitle.value.trim(),
    content: elements.postContent.value.trim(),
    author_id: state.session.user.id,
  };

  const query = elements.postId.value
    ? supabaseClient.from("posts").update(payload).eq("id", elements.postId.value)
    : supabaseClient.from("posts").insert(payload);

  const { error } = await query;
  if (error) {
    setMessage(elements.postMessage, error.message, true);
    return;
  }

  resetEditor();
  await loadPosts();
  switchView("posts");
});

elements.cancelEditButton.addEventListener("click", () => {
  resetEditor();
  switchView("posts");
});

elements.postsList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-post]");
  const deleteButton = event.target.closest("[data-delete-post]");

  if (editButton) {
    const post = state.posts.find((item) => item.id === editButton.dataset.editPost);
    elements.postId.value = post.id;
    elements.postTitle.value = post.title;
    elements.postContent.value = post.content;
    elements.postSubmitLabel.textContent = "수정 저장";
    elements.cancelEditButton.hidden = false;
    switchView("editor");
  }

  if (deleteButton) {
    const ok = confirm("이 게시글을 삭제할까요?");
    if (!ok) return;

    const { error } = await supabaseClient.from("posts").delete().eq("id", deleteButton.dataset.deletePost);
    if (error) {
      alert(error.message);
      return;
    }
    await loadPosts();
  }
});

elements.adminCreateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(elements.adminMessage, "계정을 생성하는 중입니다.");

  try {
    await callAdminFunction("createUser", {
      email: elements.adminEmail.value.trim(),
      password: elements.adminPassword.value,
      role: elements.adminRole.value,
    });
    elements.adminCreateForm.reset();
    setMessage(elements.adminMessage, "계정을 생성했습니다.");
    await loadProfiles();
  } catch (error) {
    setMessage(elements.adminMessage, error.message, true);
  }
});

elements.profilesList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-user]");
  if (!button) return;

  const ok = confirm("이 계정을 삭제할까요? 해당 사용자의 게시글도 삭제됩니다.");
  if (!ok) return;

  try {
    setMessage(elements.adminMessage, "계정을 삭제하는 중입니다.");
    await callAdminFunction("deleteUser", { userId: button.dataset.deleteUser });
    await loadProfiles();
    await loadPosts();
  } catch (error) {
    setMessage(elements.adminMessage, error.message, true);
  }
});

elements.loadProfilesButton.addEventListener("click", loadProfiles);

supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  state.session = session;
  if (session) {
    await loadProfile();
    await loadPosts();
  }
  renderSession();
});

bootstrap().catch((error) => {
  setMessage(elements.authMessage, error.message, true);
  renderSession();
});
