document.addEventListener("DOMContentLoaded", () => {
  pageLoaded();
});

let txt1, txt2, btn, lblRes, opSelect;

function pageLoaded() {
  txt1 = document.getElementById('txt1');
  txt2 = document.getElementById('txt2');
  btn = document.getElementById('btnCalc');
  lblRes = document.getElementById('lblRes');
  opSelect = document.getElementById('opSelect');

  btn.addEventListener('click', () => { calculate(); });

  const btn2 = document.getElementById("btn2");
  btn2.addEventListener("click", () => {
    print("btn2 clicked: " + btn2.id + " | " + btn2.innerText);
  });
}

function validateNumberInput(el) {
  const v = el.value.trim();
  if (v === "" || isNaN(v)) {
    el.classList.remove("is-valid");
    el.classList.add("is-invalid");
    return null;
  } else {
    el.classList.remove("is-invalid");
    el.classList.add("is-valid");
    return parseFloat(v);
  }
}

function calculate() {
  const a = validateNumberInput(txt1);
  const b = validateNumberInput(txt2);
  if (a === null || b === null) {
    lblRes.innerText = "";
    print("Please enter valid numbers in both fields", true);
    return;
  }

  const op = opSelect.value;
  let r;

  if (op === "+") r = a + b;
  else if (op === "-") r = a - b;
  else if (op === "*") r = a * b;
  else if (op === "/") {
    if (b === 0) {
      lblRes.innerText = "Division by 0 not allowed";
      print(`[ ${a} ] [ ${op} ] [ ${b} ] [ = ] [ ERROR: divide by 0 ]`, true);
      return;
    }
    r = a / b;
  }

  lblRes.innerText = r;
  print(`[ ${a} ] [ ${op} ] [ ${b} ] [ = ] [ ${r} ]`, true);
}

function print(msg, append = false) {
  const ta = document.getElementById("output");
  if (!ta) return;

  if (append && ta.value) ta.value += "\n" + msg;
  else if (append) ta.value = msg;
  else ta.value = msg;

  ta.scrollTop = ta.scrollHeight;
}

function demoNative() {
  let o = "=== STEP 1: NATIVE TYPES ===\n";
  const s = "Hello World";
  o += "\n[String] " + s;
  o += "\nLength: " + s.length;
  o += "\nUpper: " + s.toUpperCase();
  const n = 42;
  o += "\n\n[Number] " + n;
  const b = true;
  o += "\n\n[Boolean] " + b;
  const d = new Date();
  o += "\n\n[Date] " + d.toISOString();
  const arr = [1, 2, 3, 4];
  o += "\n\n[Array] " + arr.join(", ");
  o += "\nPush 5 → " + (arr.push(5), arr.join(", "));
  o += "\nMap x2 → " + arr.map(x => x * 2).join(", ");
  const add = function (x, y) { return x + y; };
  o += "\n\n[Function] add(3,4) = " + add(3, 4);
  function calc(a, b, fn) { return fn(a, b); }
  o += "\n[Callback] = " + calc(10, 20, (x, y) => x + y);
  print(o);
}
