import React, { useState, useMemo } from "react";

/* =========================================================================
   GREENBOX — Trò chơi mô phỏng dòng tiền 12 tháng
   Xoay quanh "Mẫu Kế hoạch tài chính chung" — 4 câu hỏi nền tảng.
   Case dựng sẵn: nông trại rau hữu cơ + hộp rau theo tuần (startup nông sản ASEAN).
   Bài học cốt lõi: Lãi trên sổ sách ≠ Dòng tiền thực. Khả thi = trụ vững.
   ========================================================================= */

// ---------- Hằng số dự án (đơn vị tiền: triệu đồng) ----------
const PRICE = 0.05;                 // giá bình quân (triệu/kg rau hữu cơ ~50.000đ)
const MARKET = 40000;               // quy mô thị trường mục tiêu (kg/năm)
const TOTAL_INVEST = 800;           // tổng đầu tư
const RAISE = 300;                  // cần huy động thêm
const START_CASH = 80;              // vốn lưu động tiền mặt khởi điểm
const DEP = 90;                     // khấu hao/năm
const VAR_M = 12.5;                 // chi phí biến đổi vận hành/tháng
const FIXED_M = 30;                 // chi phí cố định/tháng
const TAX = 0.2;

const CHANNELS = {
  wholesale: { label: "Đẩy mạnh kênh sỉ (siêu thị, chuỗi rau sạch)", vol: 20000, pf: 0.92, w: 0.7,
    desc: "Đơn đều, giá thấp hơn 8%. Siêu thị trả tiền sau 2 tháng.", tag: "Lãi tốt · tiền về chậm" },
  balanced: { label: "Cân bằng sỉ – lẻ", vol: 20000, pf: 1.0, w: 0.5,
    desc: "Giá chuẩn. Một nửa thu ngay (hộp rau, chợ phiên), một nửa thu sau 2 tháng (siêu thị).", tag: "Cân bằng" },
  retail:    { label: "Ưu tiên hộp rau theo tuần, thu tiền nhanh", vol: 16000, pf: 1.05, w: 0.3,
    desc: "Giá cao +5%, thu ngay là chính, nhưng sản lượng tiêu thụ thấp hơn 20%.", tag: "Tiền êm · lãi mỏng" },
};

const MANGO = {
  bulk:     { label: "Mở rộng dồn cho vụ cao điểm", total: 270, dist: { 4: 0.3, 5: 0.4, 6: 0.3 },
    desc: "Dồn giống + cải tạo đất + nhà lưới vào T4–T6 cho vụ mùa mưa (rau khan, giá tốt). Vật tư số lượng lớn rẻ hơn 10%, nhưng ngốn tiền giữa năm và dễ hao hụt nếu không bán kịp.", tag: "Rẻ nhất · căng tiền" },
  moderate: { label: "Mở rộng vừa, gối vụ", total: 300, dist: { 3: 0.1, 4: 0.2, 5: 0.25, 6: 0.25, 7: 0.2 },
    desc: "Chi phí trồng trọt giá gốc, dàn từ T3–T7.", tag: "Trung dung" },
  even:     { label: "Trồng cuốn chiếu quanh năm", total: 345, dist: null,
    desc: "Đắt hơn 15% (vật tư mua lắt nhắt, gối vụ liên tục), nhưng dòng tiền êm nhất và ít rau hỏng.", tag: "Đắt · an toàn" },
};

const fmt = (n) => {
  const r = Math.round(n);
  return (r < 0 ? "−" : "") + Math.abs(r).toLocaleString("vi-VN") + " tr";
};
const MONTHS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

// ---------- Mô hình tài chính: dựng dòng tiền 12 tháng ----------
function project(d) {
  const ch = CHANNELS[d.channel] || CHANNELS.balanced;
  const annualRev = ch.vol * PRICE * ch.pf;
  const mRev = annualRev / 12;
  const wShare = ch.w, rShare = 1 - ch.w;

  // Chưa quyết định mở rộng (trước T4) → chưa phát sinh chi phí trồng trọt mở rộng
  const mg = d.mango ? MANGO[d.mango] : null;
  const mango = (m) => (mg ? (mg.dist ? mg.total * (mg.dist[m] || 0) : mg.total / 12) : 0);
  const totalMango = mg ? mg.total : 0;

  const green = d.green === "yes";
  const greenOut = (m) => (green && m === 2 ? 40 : 0);
  const greenIn = (m) => (green && m >= 5 ? 3 : 0);
  const greenRevYr = green ? 24 : 0;
  const greenCostBook = green ? 40 - greenRevYr : 0; // ròng năm 1

  const r = d.rescue; // {type, month} | null
  const rm = r ? r.month : 0;

  const rows = [];
  let cash = START_CASH;
  for (let m = 1; m <= 12; m++) {
    let cashIn = rShare * mRev + (m >= 3 ? wShare * mRev : 0);
    // đàm phán: kéo một khoản sỉ về sớm (−5%), rồi tháng sau hụt đi
    if (r && r.type === "negotiate") {
      if (m === rm) cashIn += wShare * mRev * 0.95;
      if (m === rm + 1) cashIn -= wShare * mRev;
    }
    let rescueIn = 0;
    if (r && m === rm) {
      if (r.type === "loan") rescueIn = 150;
      if (r.type === "liquidate") rescueIn = 60;
    }
    const interest = r && r.type === "loan" && m >= rm ? 150 * 0.015 : 0;

    const out = mango(m) + VAR_M + FIXED_M + greenOut(m);
    const net = cashIn + greenIn(m) + rescueIn - out - interest;
    cash += net;
    rows.push({
      m, cashIn, mango: mango(m), varc: VAR_M, fixed: FIXED_M,
      greenOut: greenOut(m), greenIn: greenIn(m), rescueIn, interest,
      net, cash, rev: mRev,
    });
  }

  // Sổ sách (kế toán dồn tích — năm)
  const finance =
    r?.type === "loan" ? 150 * 0.015 * (12 - rm + 1) :
    r?.type === "negotiate" ? wShare * mRev * 0.05 :
    r?.type === "liquidate" ? 15 : 0;
  const pbt = annualRev - totalMango - VAR_M * 12 - FIXED_M * 12 - DEP - greenCostBook - finance;
  const tax = Math.max(0, pbt) * TAX;
  const pat = pbt - tax;

  const minCash = Math.min(...rows.map((x) => x.cash));
  const endCash = rows[11].cash;
  const cumBook = rows.map((x) => (pbt * x.m) / 12);

  return {
    rows, annualRev, mRev, wShare, rShare, totalMango,
    green, greenRevYr, greenCostBook, pbt, tax, pat, minCash, endCash, cumBook,
    vol: ch.vol, marketShare: ch.vol / MARKET, payback: pat > 0 ? TOTAL_INVEST / pat : Infinity,
    chLabel: ch.label,
  };
}

// ---------- Bảng màu (MCG Forest & Moss) ----------
const C = {
  forest: "#2C5544", forestDark: "#21443766", moss: "#5E8F73", gold: "#C68A14",
  brick: "#C0492E", cream: "#F6F2E9", paper: "#FCFAF4", ink: "#22302A",
  muted: "#7C8A82", line: "#E6DECB", lineSoft: "#EFE9DA",
};

export default function App() {
  const [phase, setPhase] = useState("intro"); // intro | play | gameover | summary
  const [month, setMonth] = useState(1);
  const [d, setD] = useState({ channel: null, green: null, mango: null, rescue: null });
  const [rescued, setRescued] = useState(false);
  const [crisis, setCrisis] = useState(false);

  const P = useMemo(() => {
    if (!d.channel) return null; // tính dòng tiền ngay khi đã chọn chiến lược bán
    return project(d);
  }, [d]);

  const start = () => { setPhase("play"); setMonth(1); };
  const reset = () => {
    setPhase("intro"); setMonth(1); setRescued(false); setCrisis(false);
    setD({ channel: null, green: null, mango: null, rescue: null });
  };

  // ---- Logic lượt chơi ----
  // Quyết định gắn theo tháng: T1 kênh, T2 lớp xanh, T4 mua nguyên liệu
  const needChannel = month === 1 && !d.channel;
  const needGreen = month === 2 && d.green === null;
  const needMango = month === 4 && !d.mango;
  const awaitingDecision = needChannel || needGreen || needMango;

  const cur = P && !awaitingDecision ? P.rows[month - 1] : null;
  // Phát hiện vỡ thanh khoản
  const broke = cur && cur.cash < 0;
  const showCrisis = broke && !rescued && !crisis;

  const advance = () => {
    if (month >= 12) { setPhase("summary"); return; }
    setMonth(month + 1);
  };

  // =====================================================================
  return (
    <div style={{ minHeight: "100%", background: C.cream, fontFamily: "'Be Vietnam Pro', sans-serif", color: C.ink }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes rise { from { opacity:0; transform: translateY(14px);} to {opacity:1; transform:none;} }
        @keyframes pop { from { opacity:0; transform: scale(.96);} to {opacity:1; transform:none;} }
        @keyframes pulseRed { 0%,100%{ box-shadow:0 0 0 0 rgba(192,73,46,.35);} 50%{ box-shadow:0 0 0 10px rgba(192,73,46,0);} }
        .rise{ animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
        .pop{ animation: pop .35s ease both; }
        .serif{ font-family:'Lora', serif; }
        .btn{ cursor:pointer; border:none; transition: transform .12s ease, filter .12s ease; }
        .btn:hover{ filter:brightness(1.06); }
        .btn:active{ transform: translateY(1px); }
        .card{ transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease; }
        .pick:hover{ transform: translateY(-2px); box-shadow:0 10px 24px -14px rgba(34,48,42,.4); }
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 20px 64px" }}>

        {/* ================= INTRO ================= */}
        {phase === "intro" && (
          <div className="rise">
            <span style={pill}>MÔ PHỎNG DÒNG TIỀN · 12 THÁNG</span>
            <h1 className="serif" style={{ fontSize: "clamp(28px, 7vw, 40px)", lineHeight: 1.12, margin: "16px 0 10px", color: C.forest }}>
              GreenBox — sống sót đến điểm hoàn vốn
            </h1>
            <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#46554d", maxWidth: 680 }}>
              Bạn vừa khởi nghiệp một <b>nông trại rau hữu cơ</b> giao hộp rau theo tuần, ở vành đai rau ven đô.
              Bản kế hoạch cho thấy cả năm có lãi. Nhưng dự án sống hay chết được quyết định bởi
              <b> tiền mặt trong két mỗi tháng</b> — chứ không phải con số lãi cuối năm.
            </p>

            <div className="gb-grid2" style={{ margin: "22px 0" }}>
              {[
                ["1", C.forest, "Vì sao đáng đầu tư?", "Thị trường 40.000 kg/năm · giá bình quân 50.000đ/kg."],
                ["2", C.moss, "Cần bao nhiêu, hoàn vốn ra sao?", "Tổng đầu tư 800 tr · cần huy động thêm 300 tr."],
                ["3", C.gold, "Giữ dòng tiền tới hoàn vốn?", "Vụ cao điểm giữa năm · siêu thị trả sau 2 tháng → đây là màn chơi."],
                ["4", C.brick, "Trụ được khi bất lợi?", "Tổng kết cuối năm sẽ chấm điểm khả năng trụ vững."],
              ].map(([n, col, t, s], i) => (
                <div key={i} className="card" style={{ background: C.paper, border: `1px solid ${C.line}`, borderTop: `4px solid ${col}`, borderRadius: 14, padding: "16px 16px 14px" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: col, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{n}</div>
                  <div className="serif" style={{ fontWeight: 700, fontSize: 16.5, color: C.forest, marginBottom: 4 }}>{t}</div>
                  <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>{s}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.forest, color: "#fff", borderRadius: 14, padding: "16px 18px", fontSize: 14.5, lineHeight: 1.55 }}>
              <b>Luật chơi:</b> bạn ra 3 quyết định lớn (chiến lược bán · lớp xanh · cách mở rộng trồng trọt),
              rồi xem dòng tiền chạy qua từng tháng. <b>Hết tiền mặt một tháng bất kỳ = thua</b>, dù sổ sách vẫn lãi.
            </div>

            <button className="btn" onClick={start} style={{ ...cta, marginTop: 22 }}>Bắt đầu năm vận hành →</button>
          </div>
        )}

        {/* ================= PLAY ================= */}
        {phase === "play" && (
          <>
            {P && <HUD P={P} month={month} cur={cur} awaiting={awaitingDecision} d={d} />}

            {/* --- Quyết định: kênh bán (T1) --- */}
            {needChannel && (
              <Decision title="Quyết định đầu năm — Chiến lược bán hàng" sub="Cách bán quyết định tiền về nhanh hay chậm. Chọn một hướng cho cả năm.">
                {Object.entries(CHANNELS).map(([k, v]) => (
                  <Pick key={k} accent={C.forest} tag={v.tag} title={v.label} desc={v.desc}
                    onClick={() => setD({ ...d, channel: k })} />
                ))}
              </Decision>
            )}

            {/* --- Quyết định: lớp xanh (T2) --- */}
            {needGreen && (
              <Decision title="Tháng 2 — Lớp xanh" sub="Đầu tư bền vững vừa tốn chi phí trước, vừa tạo giá trị sau. Năm đầu thường là chi nhiều hơn thu.">
                <Pick accent={C.moss} tag="Đúng định hướng · căng tiền hơn"
                  title="Đầu tư chứng nhận hữu cơ + ủ phân compost từ phụ phẩm"
                  desc="Chi 40 tr (trả ngay T2). Từ T5 có thêm ~3 tr/tháng từ bán phân compost & cây giống, kèm giảm chi phí phân bón. Mở đường premium giá & vốn vay xanh từ năm sau."
                  onClick={() => setD({ ...d, green: "yes" })} />
                <Pick accent={C.muted} tag="Giữ tiền · để năm sau"
                  title="Chưa làm lớp xanh năm nay"
                  desc="Giữ lại 40 tr tiền mặt, dòng tiền năm 1 dễ thở hơn. Đánh đổi: chậm chân về định vị bền vững."
                  onClick={() => setD({ ...d, green: "no" })} />
              </Decision>
            )}

            {/* --- Quyết định: mua nguyên liệu (T4) --- */}
            {needMango && (
              <Decision title="Tháng 4 — Bước vào vụ cao điểm" sub="Đây là nút thắt dòng tiền: mở rộng càng lớn thì vật tư càng rẻ, nhưng ngốn tiền mặt đúng lúc siêu thị chưa trả.">
                {Object.entries(MANGO).map(([k, v]) => (
                  <Pick key={k} accent={C.gold} tag={v.tag} title={v.label} desc={v.desc}
                    onClick={() => setD({ ...d, mango: k })} />
                ))}
              </Decision>
            )}

            {/* --- Kết quả tháng --- */}
            {cur && !showCrisis && (
              <MonthCard key={month} cur={cur} prev={month > 1 ? P.rows[month - 2] : null} P={P} month={month} />
            )}

            {/* --- Khủng hoảng thanh khoản --- */}
            {showCrisis && (
              <div className="pop" style={{ ...box, border: `2px solid ${C.brick}`, animation: "pop .35s ease both, pulseRed 1.8s ease infinite" }}>
                <span style={{ ...miniPill, background: C.brick }}>⚠ VỠ THANH KHOẢN — {MONTHS[month - 1]}</span>
                <h2 className="serif" style={{ color: C.brick, fontSize: 24, margin: "12px 0 6px" }}>
                  Két tiền cạn: {fmt(cur.cash)}
                </h2>
                <p style={{ fontSize: 14.5, color: "#5a4a45", lineHeight: 1.55, marginBottom: 4 }}>
                  Trớ trêu: sổ sách cả năm vẫn lãi <b>{fmt(P.pbt)}</b> trước thuế. Nhưng tiền chi cho giống & vật tư đã ra,
                  còn tiền siêu thị thì chưa về. Bạn cần xoay tiền <b>ngay tháng này</b>:
                </p>
                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  <Pick accent={C.forest} tag="Cứu chắc · tốn lãi"
                    title="Vay vốn lưu động ngắn hạn 150 tr"
                    desc="Có tiền ngay. Lãi 1,5%/tháng tới cuối năm, ăn vào lợi nhuận nhưng giữ dự án sống."
                    onClick={() => { setD({ ...d, rescue: { type: "loan", month } }); setRescued(true); }} />
                  <Pick accent={C.moss} tag="Không vay · mất chút giá"
                    title="Đàm phán siêu thị trả sớm (chiết khấu 5%)"
                    desc="Kéo một khoản phải thu về sớm 1 tháng, đổi lại giảm 5% giá trị đơn đó."
                    onClick={() => { setD({ ...d, rescue: { type: "negotiate", month } }); setRescued(true); }} />
                  <Pick accent={C.gold} tag="Tiền nhỏ · lãi giảm"
                    title="Bán xả lô rau cho mối sỉ giá rẻ (+60 tr)"
                    desc="Có ngay 60 tr nhưng bán dưới giá, lợi nhuận năm giảm ~15 tr."
                    onClick={() => { setD({ ...d, rescue: { type: "liquidate", month } }); setRescued(true); }} />
                  <Pick accent={C.brick} tag="Mạo hiểm"
                    title="Không huy động — cố cầm cự"
                    desc="Không xoay tiền. Nếu tháng này âm thì coi như mất khả năng thanh toán."
                    onClick={() => setPhase("gameover")} />
                </div>
              </div>
            )}

            {/* --- Điều hướng --- */}
            {cur && !showCrisis && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                <span style={{ fontSize: 13, color: C.muted }}>
                  {month < 12 ? "Dòng tiền cập nhật theo từng quyết định." : "Đã qua 12 tháng."}
                </span>
                <button className="btn" onClick={advance} style={cta}>
                  {month < 12 ? `Sang ${MONTHS[month]} →` : "Xem tổng kết năm →"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ================= GAME OVER ================= */}
        {phase === "gameover" && P && (
          <div className="pop" style={{ ...box, borderTop: `6px solid ${C.brick}` }}>
            <span style={{ ...miniPill, background: C.brick }}>KẾT THÚC — VỠ THANH KHOẢN</span>
            <h1 className="serif" style={{ color: C.brick, fontSize: 32, margin: "14px 0 8px" }}>
              Dự án dừng lại ở {MONTHS[month - 1]}
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#5a4a45", maxWidth: 660 }}>
              Đây chính là bài học số 1 của kế hoạch tài chính:
              một dự án <b>có lãi trên sổ sách</b> ({fmt(P.pbt)} trước thuế cả năm) vẫn có thể chết
              vì <b>hết tiền mặt giữa đường</b>. Chi phí trồng trọt dồn vào vụ cao điểm, trong khi tiền siêu thị
              về chậm 2 tháng — khoảng trống đó nuốt sạch vốn lưu động.
            </p>
            <div style={{ background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", margin: "18px 0", fontSize: 14.5, lineHeight: 1.55 }}>
              <b style={{ color: C.forest }}>Lẽ ra:</b> mức tiền mặt thấp nhất trong năm là <b>{fmt(P.minCash)}</b>.
              Đó chính là <b>vốn lưu động</b> cần chuẩn bị trước — hoặc dàn lại lịch mua nguyên liệu,
              hoặc đẩy nhanh thu tiền.
            </div>
            <button className="btn" onClick={reset} style={cta}>Chơi lại với chiến lược khác ↺</button>
          </div>
        )}

        {/* ================= SUMMARY ================= */}
        {phase === "summary" && P && <Summary P={P} reset={reset} />}
      </div>
    </div>
  );
}

/* ===================== Thành phần phụ ===================== */

function HUD({ P, month, cur, awaiting, d }) {
  const cash = cur ? cur.cash : (awaiting ? lastCash(P, month) : START_CASH);
  const book = cur ? P.cumBook[month - 1] : (awaiting ? (month > 1 ? P.cumBook[month - 2] : 0) : 0);
  const cashCol = cash < 0 ? C.brick : cash < 30 ? C.gold : C.forest;
  const maxAbs = Math.max(120, ...P.rows.map((r) => Math.abs(r.cash)));
  return (
    <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px 18px", marginBottom: 16, boxShadow: "0 6px 20px -16px rgba(34,48,42,.5)" }}>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div style={lbl}>THỜI ĐIỂM</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: C.forest }}>{MONTHS[month - 1]} <span style={{ fontSize: 13, color: C.muted }}>/ 12</span></div>
        </div>
        <div style={{ borderLeft: `1px solid ${C.line}`, paddingLeft: 18 }}>
          <div style={lbl}>TIỀN MẶT TRONG KÉT</div>
          <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: cashCol }}>{fmt(cash)}</div>
        </div>
        <div style={{ borderLeft: `1px solid ${C.line}`, paddingLeft: 18 }}>
          <div style={lbl}>LÃI SỔ SÁCH (lũy kế)</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 600, color: book >= 0 ? C.moss : C.brick }}>{fmt(book)}</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted, textAlign: "right", maxWidth: 180 }}>
          {d.channel ? CHANNELS[d.channel].label : "Chưa chọn chiến lược"}
        </div>
      </div>
      {/* Dải dòng tiền 12 tháng */}
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 56, marginTop: 14 }}>
        {P.rows.map((r, i) => {
          const revealed = i < month;
          const h = Math.max(4, (Math.abs(r.cash) / maxAbs) * 46);
          const col = !revealed ? C.lineSoft : r.cash < 0 ? C.brick : r.cash < 30 ? C.gold : C.moss;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: "100%", height: h, background: col, borderRadius: 3, opacity: revealed ? 1 : .5, transition: "height .3s ease, background .3s" }} />
              <div style={{ fontSize: 9.5, color: i === month - 1 ? C.forest : C.muted, fontWeight: i === month - 1 ? 700 : 400 }}>{MONTHS[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function lastCash(P, month) { return month > 1 ? P.rows[month - 2].cash : START_CASH; }

function Decision({ title, sub, children }) {
  return (
    <div className="rise" style={{ ...box }}>
      <span style={miniPill}>QUYẾT ĐỊNH</span>
      <h2 className="serif" style={{ fontSize: 23, color: C.forest, margin: "10px 0 4px" }}>{title}</h2>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>{sub}</p>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function Pick({ accent, tag, title, desc, onClick }) {
  return (
    <button className="btn card pick" onClick={onClick}
      style={{ textAlign: "left", background: "#fff", border: `1px solid ${C.line}`, borderLeft: `4px solid ${accent}`, borderRadius: 12, padding: "13px 15px", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <span className="serif" style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: accent, whiteSpace: "nowrap" }}>{tag}</span>
      </div>
      <div style={{ fontSize: 13.5, color: "#5b6862", lineHeight: 1.5, marginTop: 4 }}>{desc}</div>
    </button>
  );
}

function MonthCard({ cur, prev, P, month }) {
  const delta = cur.cash - (prev ? prev.cash : START_CASH);
  const lines = [
    ["Tiền thực thu", cur.cashIn, C.moss],
    cur.mango > 0 ? ["(−) Giống · làm đất · vật tư trồng", -cur.mango, C.gold] : null,
    ["(−) Chi biến đổi vận hành", -cur.varc, C.ink],
    ["(−) Chi phí cố định", -cur.fixed, C.ink],
    cur.greenOut > 0 ? ["(−) Đầu tư lớp xanh", -cur.greenOut, C.moss] : null,
    cur.greenIn > 0 ? ["(+) Doanh thu phụ phẩm (xanh)", cur.greenIn, C.moss] : null,
    cur.rescueIn > 0 ? ["(+) Tiền xoay khẩn cấp", cur.rescueIn, C.brick] : null,
    cur.interest > 0 ? ["(−) Lãi vay vốn lưu động", -cur.interest, C.brick] : null,
  ].filter(Boolean);

  const note = month >= 4 && month <= 6 && cur.mango > 0
    ? "Vụ cao điểm — tiền ra cho giống & vật tư, nhưng tiền bán siêu thị tháng này phải 2 tháng nữa mới về."
    : month === 3 ? "Khoản bán sỉ của T1 bắt đầu về két." : null;

  return (
    <div className="pop" style={{ ...box }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="serif" style={{ fontSize: 22, color: C.forest, margin: 0 }}>Dòng tiền {MONTHS[month - 1]}</h2>
        <span className="serif" style={{ fontSize: 18, fontWeight: 700, color: delta >= 0 ? C.moss : C.brick }}>
          {delta >= 0 ? "▲ " : "▼ "}{fmt(delta)}
        </span>
      </div>
      <div style={{ marginTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
        {lines.map(([t, v, col], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 14 }}>
            <span style={{ color: "#4c5a53" }}>{t}</span>
            <span style={{ fontWeight: 600, color: v >= 0 ? col : C.brick }}>{fmt(v)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0 0", fontSize: 15 }}>
          <span style={{ fontWeight: 700, color: C.ink }}>Tiền mặt cuối {MONTHS[month - 1]}</span>
          <span className="serif" style={{ fontWeight: 700, fontSize: 18, color: cur.cash < 0 ? C.brick : cur.cash < 30 ? C.gold : C.forest }}>{fmt(cur.cash)}</span>
        </div>
      </div>
      {note && (
        <div style={{ marginTop: 12, background: C.cream, borderRadius: 10, padding: "10px 13px", fontSize: 13, color: "#5b6862", lineHeight: 1.5 }}>
          💡 {note}
        </div>
      )}
    </div>
  );
}

function Summary({ P, reset }) {
  const verdict =
    P.pat <= 0 ? { t: "Sống sót — nhưng chưa sinh lời", c: C.gold, s: "Bạn giữ được thanh khoản, nhưng giá/sản lượng chưa đủ để có lãi. Xem lại Câu 1 & 2." }
    : { t: "Khả thi — nhờ quản trị dòng tiền", c: C.moss, s: "Dự án vừa có lãi vừa giữ được tiền mặt qua mùa căng. Đây là khả thi thực sự." };

  const Q = ({ n, col, title, rows }) => (
    <div className="card" style={{ background: C.paper, border: `1px solid ${C.line}`, borderTop: `4px solid ${col}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span style={{ width: 24, height: 24, borderRadius: "50%", background: col, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{n}</span>
        <span className="serif" style={{ fontWeight: 700, fontSize: 15.5, color: C.forest }}>{title}</span>
      </div>
      {rows.map(([k, v, hot], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13.5, borderBottom: i < rows.length - 1 ? `1px solid ${C.lineSoft}` : "none" }}>
          <span style={{ color: "#5b6862" }}>{k}</span>
          <span style={{ fontWeight: 600, color: hot || C.ink }}>{v}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="rise">
      <span style={pill}>TỔNG KẾT NĂM 1</span>
      <h1 className="serif" style={{ fontSize: "clamp(26px, 6vw, 34px)", color: C.forest, margin: "14px 0 6px" }}>Bạn đã đưa GreenBox qua trọn 12 tháng</h1>

      {/* Câu chốt tương phản */}
      <div className="gb-grid2" style={{ background: C.forest, color: "#fff", borderRadius: 16, padding: "18px 20px", margin: "16px 0 22px", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, opacity: .8, letterSpacing: ".06em" }}>LÃI TRƯỚC THUẾ (SỔ SÁCH)</div>
          <div className="serif" style={{ fontSize: 30, fontWeight: 700 }}>{fmt(P.pbt)}</div>
        </div>
        <div style={{ borderLeft: "1px solid rgba(255,255,255,.25)", paddingLeft: 16 }}>
          <div style={{ fontSize: 12, opacity: .8, letterSpacing: ".06em" }}>TIỀN MẶT THẤP NHẤT TRONG NĂM</div>
          <div className="serif" style={{ fontSize: 30, fontWeight: 700, color: P.minCash < 30 ? "#F2C14E" : "#fff" }}>{fmt(P.minCash)}</div>
        </div>
        <div style={{ gridColumn: "1 / -1", fontSize: 13.5, lineHeight: 1.55, opacity: .92, borderTop: "1px solid rgba(255,255,255,.2)", paddingTop: 12 }}>
          Hai con số này không bao giờ bằng nhau. <b>Lợi nhuận</b> nói dự án <i>đáng làm</i>;
          <b> tiền mặt thấp nhất</b> nói bạn cần thủ sẵn bao nhiêu <b>vốn lưu động</b> để đi tới đó.
        </div>
      </div>

      <div className="gb-grid2" style={{ gap: 12 }}>
        <Q n="1" col={C.forest} title="Vì sao đáng đầu tư?" rows={[
          ["Doanh thu kế hoạch năm 1", fmt(P.annualRev)],
          ["Sản lượng bán", `${P.vol.toLocaleString("vi-VN")} kg`],
          ["Thị phần năm 1", `${(P.marketShare * 100).toFixed(0)}%`, P.marketShare > 0.8 ? C.brick : C.ink],
        ]} />
        <Q n="2" col={C.moss} title="Cần bao nhiêu, hoàn vốn ra sao?" rows={[
          ["Tổng đầu tư", fmt(TOTAL_INVEST)],
          ["Cần huy động thêm", fmt(RAISE)],
          ["Hoàn vốn ước tính", P.payback === Infinity ? "Chưa hoàn được" : `${P.payback.toFixed(1)} năm`, P.payback > 5 ? C.brick : C.ink],
        ]} />
        <Q n="3" col={C.gold} title="Giữ dòng tiền tới hoàn vốn?" rows={[
          ["Tiền mặt thấp nhất", fmt(P.minCash), P.minCash < 0 ? C.brick : P.minCash < 30 ? C.gold : C.ink],
          ["Vốn lưu động nên thủ", fmt(Math.max(0, 30 - P.minCash)), C.gold],
          ["Tiền mặt cuối năm", fmt(P.endCash)],
        ]} />
        <Q n="4" col={C.brick} title="Trụ được khi bất lợi?" rows={[
          ["Lãi sau thuế năm 1", fmt(P.pat), P.pat < 0 ? C.brick : C.moss],
          ["Đóng góp ròng lớp xanh (năm 1)", P.green ? fmt(P.greenRevYr - 40) : "Chưa làm", P.green ? C.gold : C.muted],
          ["Đệm an toàn", P.pat > 0 ? "Có lãi để chịu sốc" : "Mỏng", P.pat > 0 ? C.moss : C.brick],
        ]} />
      </div>

      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderLeft: `5px solid ${verdict.c}`, borderRadius: 14, padding: "16px 18px", marginTop: 18 }}>
        <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: verdict.c, marginBottom: 4 }}>{verdict.t}</div>
        <p style={{ fontSize: 14.5, color: "#4c5a53", lineHeight: 1.6, margin: 0 }}>{verdict.s}</p>
        {P.green && (
          <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginTop: 8, marginBottom: 0 }}>
            🌱 Lớp xanh năm 1 lỗ nhẹ (chi 40, thu {fmt(P.greenRevYr)}) — đúng bản chất: <b>xanh tốn trước, hái quả từ năm 2</b> (premium giá, doanh thu phụ phẩm, lãi vay ưu đãi).
          </p>
        )}
      </div>

      <div style={{ background: C.cream, borderRadius: 14, padding: "16px 18px", marginTop: 14, fontSize: 14, color: "#4c5a53", lineHeight: 1.6 }}>
        <b style={{ color: C.forest }}>Bước tiếp theo trong template:</b> game này trả lời Câu 3 (dòng tiền 12 tháng).
        Để khép trọn Câu 4, mở <b>sheet 04</b> chạy NPV/IRR 5 năm và kéo hai hệ số <i>giá bán · sản lượng</i> về kịch bản bất lợi
        xem dự án có còn dương không.
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button className="btn" onClick={reset} style={cta}>Thử chiến lược khác ↺</button>
      </div>
    </div>
  );
}

/* ===================== Style dùng chung ===================== */
const pill = { display: "inline-block", background: C.forest, color: "#fff", fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", padding: "7px 16px", borderRadius: 999 };
const miniPill = { display: "inline-block", background: C.gold, color: "#fff", fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", padding: "5px 11px", borderRadius: 999 };
const box = { background: C.paper, border: `1px solid ${C.line}`, borderRadius: 16, padding: "20px 20px", boxShadow: "0 6px 22px -18px rgba(34,48,42,.55)" };
const cta = { background: C.forest, color: "#fff", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 11 };
const lbl = { fontSize: 10.5, letterSpacing: ".08em", color: C.muted, fontWeight: 600, marginBottom: 2 };
