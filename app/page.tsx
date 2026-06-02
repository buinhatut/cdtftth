"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  username: string;
  role: "CN" | "VTKV" | "CNKD";
  vt_kv: string;
  cnkd_name: string;
  must_change_password: boolean;
};

type Customer = {
  account_key: string;
  vt_kv: string;
  cnkd_name: string;
  customer_name: string;
  phone: string;
  package_name: string;
  expire_date: string;
  prepaid_month: string | number;
  amount: string | number;
  import_date: string;
  current_status: string;
  last_call_result?: string;
  last_renew_result?: string;
  last_reason?: string;
  callback_date?: string;
  last_note?: string;
  last_updated_by?: string;
  last_updated_at?: string;
};

type Dashboard = {
  total: number;
  chua_goi: number;
  da_goi: number;
  da_gia_han: number;
  hen_goi_lai: number;
  khong_lien_he: number;
  tu_choi: number;
  sai_so: number;
  ty_le_gia_han: number;
  total_amount: number;
  renewed_amount: number;
  remaining_amount: number;
  ty_le_tien_gia_han: number;
};

type ConfigStatus = {
  type: string;
  code: string;
  name: string;
  active: string;
  sort_order: number;
};

type ConfigReason = {
  reason_id: string;
  reason_name: string;
  active: string;
  sort_order: number;
};

const STATUS_LABEL: Record<string, string> = {
  ALL: "Tất cả",
  CHUA_GOI: "Chưa gọi",
  DA_GOI: "Đã gọi",
  DA_GIA_HAN: "Đã gia hạn",
  HEN_GOI_LAI: "Hẹn gọi lại",
  KHONG_LIEN_HE: "Không liên hệ",
  TU_CHOI: "Từ chối",
  SAI_SO: "Sai số",
};

const STATUS_STYLE: Record<string, string> = {
  CHUA_GOI: "bg-slate-100 text-slate-700",
  DA_GOI: "bg-blue-100 text-blue-700",
  DA_GIA_HAN: "bg-green-100 text-green-700",
  HEN_GOI_LAI: "bg-amber-100 text-amber-700",
  KHONG_LIEN_HE: "bg-orange-100 text-orange-700",
  TU_CHOI: "bg-red-100 text-red-700",
  SAI_SO: "bg-zinc-800 text-white",
};

async function apiPost(action: string, data: any = {}) {
  const res = await fetch("/api/cdt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ action, ...data }),
  });

  return res.json();
}

function money(v: any) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("vi-VN") + " đ";
}

function pct(v: number) {
  return `${Math.round((v || 0) * 1000) / 10}%`;
}

function formatDateVN(dateStr: any) {
  if (!dateStr) return "-";

  const s = String(dateStr);

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.substring(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return s;

  return d.toLocaleDateString("vi-VN");
}

function parseCSV(text: string) {
  const lines = text.replace(/\r/g, "").split("\n").filter((x) => x.trim() !== "");
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line).map((v) => v.trim());
    const obj: any = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}

function splitCSVLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [configStatus, setConfigStatus] = useState<ConfigStatus[]>([]);
  const [configReason, setConfigReason] = useState<ConfigReason[]>([]);

  const [selectedStatus, setSelectedStatus] = useState("CHUA_GOI");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [updateForm, setUpdateForm] = useState({
    call_result: "DA_NGHE_MAY",
    renew_result: "CHUA_GIA_HAN",
    reason: "",
    callback_date: "",
    note: "",
  });

  const mustChangePassword = !!user?.must_change_password;

  useEffect(() => {
    const saved = localStorage.getItem("cdt_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (user && !mustChangePassword) {
      loadAll();
    }
  }, [user, mustChangePassword, selectedStatus]);

  async function handleLogin() {
    setLoading(true);
    setMessage("");

    const data = await apiPost("login", loginForm);
    setLoading(false);

    if (data.status !== "OK") {
      setMessage(data.message || "Đăng nhập lỗi");
      return;
    }

    setUser(data.user);
    localStorage.setItem("cdt_user", JSON.stringify(data.user));

    setPasswordForm({
      old_password: loginForm.password,
      new_password: "",
      confirm_password: "",
    });
  }

  async function handleChangePassword() {
    if (!user) return;

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage("Mật khẩu mới nhập lại chưa khớp");
      return;
    }

    setLoading(true);
    setMessage("");

    const data = await apiPost("changePassword", {
      username: user.username,
      old_password: passwordForm.old_password,
      new_password: passwordForm.new_password,
    });

    setLoading(false);

    if (data.status !== "OK") {
      setMessage(data.message || "Đổi mật khẩu lỗi");
      return;
    }

    const newUser = { ...user, must_change_password: false };
    setUser(newUser);
    localStorage.setItem("cdt_user", JSON.stringify(newUser));
    setMessage("Đổi mật khẩu thành công");
  }

  async function loadAll() {
    await Promise.all([loadDashboard(), loadCustomers(), loadConfig()]);
  }

  async function loadDashboard() {
    if (!user) return;

    const data = await apiPost("dashboard", { user });
    if (data.status === "OK") setDashboard(data.data);
  }

  async function loadCustomers() {
    if (!user) return;

    setLoading(true);

    const data = await apiPost("getCustomers", {
      user,
      status: selectedStatus === "ALL" ? "" : selectedStatus,
      keyword,
    });

    setLoading(false);

    if (data.status === "OK") setCustomers(data.data || []);
  }

  async function loadConfig() {
    const data = await apiPost("getConfig");

    if (data.status === "OK") {
      setConfigStatus(data.config_status || []);
      setConfigReason(data.config_reason || []);
    }
  }

  function logout() {
    localStorage.removeItem("cdt_user");
    setUser(null);
    setDashboard(null);
    setCustomers([]);
  }

  function openUpdate(c: Customer) {
    setEditing(c);
    setMessage("");
    setUpdateForm({
      call_result: c.last_call_result || "DA_NGHE_MAY",
      renew_result: c.last_renew_result || "CHUA_GIA_HAN",
      reason: c.last_reason || "",
      callback_date: c.callback_date || "",
      note: c.last_note || "",
    });
  }

async function handleCall(c: Customer) {
  if (!user) return;

  setMessage("");

  const phone = String(c.phone || "").replace(/\s+/g, "");

  // Mở cuộc gọi ngay để iPhone/Safari không chặn
  window.location.href = `tel:${phone}`;

  // Ghi log phía sau, không chờ API
  apiPost("logCall", {
    account_key: c.account_key,
    phone: c.phone,
    updated_by: user.username,
    username: user.username,
    user,
  })
    .then((data) => {
      if (data.status !== "OK") {
        setMessage(data.message || "Chưa đủ thời gian giữa 2 cuộc gọi");
      }
    })
    .catch(() => {
      setMessage("Không ghi được log cuộc gọi");
    });
}

  async function saveUpdate() {
    if (!editing || !user) return;

    if (updateForm.call_result === "HEN_GOI_LAI" && !updateForm.callback_date) {
      setMessage("Trường hợp hẹn gọi lại bắt buộc nhập ngày hẹn");
      return;
    }

    if (updateForm.renew_result === "TU_CHOI" && !updateForm.reason) {
      setMessage("Trường hợp từ chối bắt buộc chọn lý do");
      return;
    }

    if (updateForm.renew_result === "CHUA_GIA_HAN" && !updateForm.reason) {
      setMessage("Chưa gia hạn cần chọn lý do");
      return;
    }

    setLoading(true);
    setMessage("");

    const data = await apiPost("updateCustomer", {
      account_key: editing.account_key,
      ...updateForm,
      updated_by: user.username,
      username: user.username,
    });

    setLoading(false);

    if (data.status !== "OK") {
      setMessage(data.message || "Cập nhật lỗi");
      return;
    }

    setMessage(`Đã cập nhật ${editing.account_key}: ${STATUS_LABEL[data.new_status] || data.new_status}`);
    setEditing(null);
    await loadDashboard();
    await loadCustomers();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user) return;

    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    setImporting(true);
    setMessage("");

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setMessage("File CSV không có dữ liệu");
        setImporting(false);
        return;
      }

      const data = await apiPost("importCustomers", {
        user,
        rows,
      });

      setImporting(false);

      if (data.status !== "OK") {
        setMessage(data.message || "Import lỗi");
        return;
      }

      let msg = `Import thành công: thêm mới ${data.inserted}, cập nhật ${data.updated}, lỗi ${data.error}`;
      if (data.errors && data.errors.length > 0) {
        msg += `. Lỗi mẫu: ${data.errors.join(" | ")}`;
      }

      setMessage(msg);
      await loadDashboard();
      await loadCustomers();
    } catch (err: any) {
      setImporting(false);
      setMessage(err?.message || "Không đọc được file CSV");
    }
  }

  const callResults = useMemo(() => {
    return configStatus
      .filter((x) => x.type === "CALL_RESULT")
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [configStatus]);

  const renewResults = useMemo(() => {
    return configStatus
      .filter((x) => x.type === "RENEW_RESULT")
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [configStatus]);

  const reasons = useMemo(() => {
    return configReason.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [configReason]);

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <div className="text-sm font-semibold text-blue-600">FTTH HNI</div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Gia hạn CĐT FTTH</h1>
            <p className="mt-2 text-sm text-slate-500">Đăng nhập để gọi KH và cập nhật kết quả</p>
          </div>

          <div className="space-y-4">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
            />

            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Mật khẩu / PIN"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />

            {message && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{message}</div>}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-3 font-bold text-white active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (mustChangePassword) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-6 shadow-xl">
          <h1 className="text-xl font-bold text-slate-900">Đổi mật khẩu lần đầu</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tài khoản <b>{user.username}</b> cần đổi mật khẩu trước khi sử dụng.
          </p>

          <div className="mt-6 space-y-4">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Mật khẩu cũ"
              type="password"
              value={passwordForm.old_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
            />

            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Mật khẩu mới"
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
            />

            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Nhập lại mật khẩu mới"
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
            />

            {message && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">{message}</div>}

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-3 font-bold text-white disabled:opacity-60"
            >
              {loading ? "Đang lưu..." : "Đổi mật khẩu"}
            </button>

            <button onClick={logout} className="w-full rounded-2xl bg-slate-100 py-3 font-bold text-slate-700">
              Đăng xuất
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <header className="sticky top-0 z-20 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-blue-600">FTTH HNI</div>
            <h1 className="text-lg font-bold text-slate-900">Gia hạn CĐT</h1>
            <div className="text-xs text-slate-500">
              {user.username} · {user.role} · {user.vt_kv || "ALL"}
            </div>
          </div>

          <button onClick={logout} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            Thoát
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard title="Tổng Account" value={dashboard?.total || 0} active={selectedStatus === "ALL"} onClick={() => setSelectedStatus("ALL")} />
          <KpiCard title="Chưa gọi" value={dashboard?.chua_goi || 0} active={selectedStatus === "CHUA_GOI"} onClick={() => setSelectedStatus("CHUA_GOI")} />
          <KpiCard title="Đã gọi" value={dashboard?.da_goi || 0} active={selectedStatus === "DA_GOI"} onClick={() => setSelectedStatus("DA_GOI")} />
          <KpiCard title="Đã gia hạn" value={dashboard?.da_gia_han || 0} active={selectedStatus === "DA_GIA_HAN"} onClick={() => setSelectedStatus("DA_GIA_HAN")} />
          <KpiCard title="Hẹn gọi lại" value={dashboard?.hen_goi_lai || 0} active={selectedStatus === "HEN_GOI_LAI"} onClick={() => setSelectedStatus("HEN_GOI_LAI")} />
          <KpiCard title="Không liên hệ" value={dashboard?.khong_lien_he || 0} active={selectedStatus === "KHONG_LIEN_HE"} onClick={() => setSelectedStatus("KHONG_LIEN_HE")} />
          <KpiCard title="Từ chối" value={dashboard?.tu_choi || 0} active={selectedStatus === "TU_CHOI"} onClick={() => setSelectedStatus("TU_CHOI")} />
          <KpiCard title="Tỷ lệ GH" value={pct(dashboard?.ty_le_gia_han || 0)} active={false} onClick={() => {}} />
        </div>

        <div className="mt-3 hidden gap-3 md:grid md:grid-cols-4">
          <KpiCard title="Tổng tiền CĐT" value={money(dashboard?.total_amount || 0)} active={false} onClick={() => {}} />
          <KpiCard title="Tiền đã GH" value={money(dashboard?.renewed_amount || 0)} active={false} onClick={() => setSelectedStatus("DA_GIA_HAN")} />
          <KpiCard title="Tiền chưa GH" value={money(dashboard?.remaining_amount || 0)} active={false} onClick={() => {}} />
          <KpiCard title="Tỷ lệ tiền GH" value={pct(dashboard?.ty_le_tien_gia_han || 0)} active={false} onClick={() => {}} />
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">{STATUS_LABEL[selectedStatus] || selectedStatus}</h2>
              <p className="text-sm text-slate-500">{customers.length} account</p>

              {user.role !== "CNKD" && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/template/FTTH_CDT_Import_Template.csv"
                      download
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white active:scale-[0.99]"
                    >
                      Tải file mẫu
                    </a>

                    <label className="inline-flex cursor-pointer items-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white active:scale-[0.99]">
                      {importing ? "Đang import..." : "Import CSV"}
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleImportFile}
                        disabled={importing}
                      />
                    </label>
                  </div>

        <div className="mt-2 hidden max-w-xl text-xs text-slate-500 md:block">
                    Header CSV: account_key,vt_kv,cnkd_name,customer_name,phone,package_name,expire_date,prepaid_month,amount
                    {user.role === "VTKV" ? " · VTKV import sẽ tự gán về VTKV của tài khoản." : ""}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 md:w-80"
                placeholder="Tìm mã TB, tên KH, SĐT..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadCustomers();
                }}
              />

              <button onClick={loadCustomers} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">
                Tìm
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`mt-3 rounded-2xl p-3 text-sm font-semibold ${
                message.includes("lỗi") || message.includes("chờ") || message.includes("thiếu") || message.includes("không")
                  ? "bg-amber-50 text-amber-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {loading && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Đang tải...</div>}

            {!loading && customers.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Không có account trong nhóm này.</div>
            )}

            {customers.map((c) => (
              <CustomerCard
                key={c.account_key}
                c={c}
                onUpdate={() => openUpdate(c)}
                onCall={handleCall}
              />
            ))}
          </div>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 md:items-center md:p-4">
          <div className="mx-auto max-h-[92vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-white p-5 shadow-xl md:rounded-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cập nhật kết quả</h3>
                <p className="text-sm text-slate-500">
                  {editing.account_key} · {editing.customer_name}
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">
                Đóng
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Kết quả gọi">
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  value={updateForm.call_result}
                  onChange={(e) => setUpdateForm({ ...updateForm, call_result: e.target.value })}
                >
                  {callResults.map((x) => (
                    <option key={x.code} value={x.code}>{x.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Kết quả gia hạn">
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  value={updateForm.renew_result}
                  onChange={(e) => setUpdateForm({ ...updateForm, renew_result: e.target.value })}
                >
                  {renewResults.map((x) => (
                    <option key={x.code} value={x.code}>{x.name}</option>
                  ))}
                </select>
              </Field>

              {updateForm.renew_result !== "DA_GIA_HAN" && (
                <Field label="Lý do">
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    value={updateForm.reason}
                    onChange={(e) => setUpdateForm({ ...updateForm, reason: e.target.value })}
                  >
                    <option value="">Chọn lý do</option>
                    {reasons.map((x) => (
                      <option key={x.reason_id} value={x.reason_name}>{x.reason_name}</option>
                    ))}
                  </select>
                </Field>
              )}

              {updateForm.renew_result !== "DA_GIA_HAN" && updateForm.call_result === "HEN_GOI_LAI" && (
                <Field label="Ngày hẹn gọi lại">
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    value={updateForm.callback_date}
                    onChange={(e) => setUpdateForm({ ...updateForm, callback_date: e.target.value })}
                  />
                </Field>
              )}

              <Field label="Ghi chú">
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  placeholder="Nhập nội dung trao đổi với KH..."
                  value={updateForm.note}
                  onChange={(e) => setUpdateForm({ ...updateForm, note: e.target.value })}
                />
              </Field>

              <button
                onClick={saveUpdate}
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 py-3 font-bold text-white disabled:opacity-60"
              >
                {loading ? "Đang lưu..." : "Lưu cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function KpiCard({
  title,
  value,
  active,
  onClick,
}: {
  title: string;
  value: string | number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-3xl p-4 text-left shadow-sm transition active:scale-[0.99] ${
        active ? "bg-blue-600 text-white" : "bg-white text-slate-900"
      }`}
    >
      <div className={`text-xs font-semibold ${active ? "text-blue-100" : "text-slate-500"}`}>{title}</div>
      <div className="mt-2 text-xl font-black md:text-2xl">{value}</div>
    </button>
  );
}

function CustomerCard({
  c,
  onUpdate,
  onCall,
}: {
  c: Customer;
  onUpdate: () => void;
  onCall: (c: Customer) => void;
}) {
  const statusClass = STATUS_STYLE[c.current_status] || "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-slate-900">{c.customer_name || "Khách hàng"}</div>
          <div className="mt-1 text-sm text-slate-500">Mã TB: {c.account_key}</div>
        </div>

        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
          {STATUS_LABEL[c.current_status] || c.current_status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Info label="VTKV" value={c.vt_kv} />
        <Info label="CNKD" value={c.cnkd_name} />
        <Info label="Gói" value={c.package_name} />
        <Info label="Hết CĐT" value={formatDateVN(c.expire_date)} />
        <Info label="Số tháng" value={String(c.prepaid_month || "")} />
        <Info label="Số tiền" value={money(c.amount)} />
      </div>

      {c.last_reason && (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          <b>Lý do:</b> {c.last_reason}
          {c.last_note ? <div className="mt-1"><b>Ghi chú:</b> {c.last_note}</div> : null}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => onCall(c)}
          className="rounded-2xl bg-green-600 py-3 text-center text-sm font-black text-white active:scale-[0.99]"
        >
          Gọi ngay
        </button>

        <button
          onClick={onUpdate}
          className="rounded-2xl bg-blue-600 py-3 text-sm font-black text-white active:scale-[0.99]"
        >
          Cập nhật
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 truncate font-semibold text-slate-800">{value || "-"}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-700">{label}</div>
      {children}
    </label>
  );
}