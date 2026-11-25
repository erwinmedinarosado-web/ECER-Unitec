'use strict';
const board = document.getElementById('board');
const exercise = document.getElementById('exercise');
const feedback = document.getElementById('feedback');
const toggle = document.getElementById('switch');
const glow = document.getElementById('glow');
const rows = ['1234', 'ABCD', 'WXYZ'];
const centersX = [180, 320, 460, 600];
const centersY = [76, 211, 351];
const lampX = [239, 384, 524, 652];
const exercises = [['A','1'], ['B','3'], ['C','4']];
const boxes = new Map();
let route = [];
let lit = false;
function render(message) {
  const [start, target] = exercises[exercise.selectedIndex];
  const end = route[route.length - 1];
  for (const [name, box] of boxes) box.button.setAttribute('aria-pressed', String(route.includes(name)));
  document.getElementById('wire').setAttribute('points', route.map(name => {
    const box = boxes.get(name);
    return [centersX[box.col], centersY[box.row]].join(',');
  }).join(' '));
  document.getElementById('route').textContent = 'Recorrido: ' + (route.join(' → ') || 'sin comenzar');
  document.getElementById('undo').disabled = document.getElementById('reset').disabled = !route.length;
  toggle.disabled = end !== target;
  toggle.textContent = lit ? 'Apagar lámpara' : 'Encender lámpara';
  glow.hidden = !lit;
  glow.style.left = lampX[Number(target)-1] / 7 + '%';
  glow.style.top = (target === '4' ? 137 : 149) / 4.5 + '%';
  feedback.textContent = message || (!end ? 'Comienza en la caja ' + start + '.' : end === target ? 'Recorrido completo. Prueba el interruptor virtual.' : 'Continúa desde ' + end + ' hasta la lámpara ' + target + '.');
}
function choose(name) {
  const [start, target] = exercises[exercise.selectedIndex];
  const last = route[route.length - 1];
  if (!last && name !== start) return render('Comienza en la caja ' + start + '.');
  if (last === target) return render('El recorrido está completo. Puedes probar la lámpara o deshacer el último paso.');
  if (route.includes(name)) return render('Ya pasaste por esa caja. Usa «Deshacer paso» para retroceder.');
  if (last) {
    const a = boxes.get(last), b = boxes.get(name);
    if (Math.abs(a.row-b.row) + Math.abs(a.col-b.col) !== 1) return render('No hay una canalización directa entre ' + last + ' y ' + name + '. Elige una caja contigua.');
  }
  route.push(name);
  render();
}
rows.forEach((names, row) => Array.from(names).forEach((name, col) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = name;
  button.setAttribute('aria-label', 'Caja ' + name);
  button.style.left = centersX[col] / 7 + '%';
  button.style.top = centersY[row] / 4.5 + '%';
  boxes.set(name, {row, col, button});
  button.addEventListener('click', () => choose(name));
  board.append(button);
}));
function reset() { route = []; lit = false; render(); }
document.getElementById('undo').onclick = () => { route.pop(); lit = false; render(); };
document.getElementById('reset').onclick = reset;
exercise.onchange = reset;
toggle.onclick = () => {
  lit = !lit;
  render('Lámpara ' + exercises[exercise.selectedIndex][1] + (lit ? ' encendida.' : ' apagada.'));
};
render();
