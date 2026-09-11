async function loadMods() {
  const q = document.querySelector("#search")?.value || "";
  const category = document.querySelector("#category")?.value || "";
  const box = document.querySelector("#mods");

  if (!box) return;

  try {
    const r = await fetch(`/api/mods?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`);
    const mods = await r.json();

    // Kiểm tra dữ liệu trả về phải là mảng
    if (!r.ok || !Array.isArray(mods)) {
      box.innerHTML = '<div class="empty">Không thể tải danh sách mod.</div>';
      return;
    }

    if (!mods.length) {
      box.innerHTML = '<div class="empty">Chưa có mod phù hợp.</div>';
      return;
    }

    box.innerHTML = mods.map(m => `
      <article class="card">
        <div><span class="tag">${esc(m.category || "Khác")}</span></div>
        <h3>${esc(m.title || "Không có tên")}</h3>
        <p>${esc(m.description || "Không có mô tả.")}</p>
        <div class="meta">${esc(m.edition || "")} ${m.version ? "• " + esc(m.version) : ""} • ${esc(m.author || "Khuyết danh")} • ${m.downloads || 0} lượt tải</div>
        <a class="download" href="/download/${m.id}">⬇ Download</a>
      </article>`).join("");
  } catch (err) {
    box.innerHTML = '<div class="empty">Lỗi kết nối máy chủ.</div>';
  }
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

const form = document.querySelector("#form");
if (form) {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const status = document.querySelector("#status");
    if (status) status.textContent = "Đang upload...";

    try {
      const r = await fetch("/api/mods", { method: "POST", body: new FormData(e.target) });
      const data = await r.json();

      if (!r.ok) {
        if (status) status.textContent = data.error || "Upload thất bại";
        return;
      }

      if (status) status.textContent = "Upload thành công!";
      e.target.reset();

      // Clear ô tìm kiếm và danh mục về mặc định để hiển thị mod mới vừa đăng
      const searchInput = document.querySelector("#search");
      const categoryInput = document.querySelector("#category");
      if (searchInput) searchInput.value = "";
      if (categoryInput) categoryInput.value = "";

      loadMods();
    } catch (err) {
      if (status) status.textContent = "Lỗi kết nối khi upload";
    }
  });
}

// Lắng nghe sự kiện gõ tìm kiếm và chuyển đổi danh mục
document.querySelector("#search")?.addEventListener("input", loadMods);
document.querySelector("#category")?.addEventListener("change", loadMods);

// Tải danh sách mod khi mở trang
loadMods();
