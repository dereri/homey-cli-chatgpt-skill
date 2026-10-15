import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const outputs = {
  trigger: ['outputSuccess'], start: ['outputSuccess'], delay: ['outputSuccess'],
  all: ['outputSuccess'], any: ['outputSuccess'], note: [],
  action: ['outputSuccess', 'outputError'],
  condition: ['outputTrue', 'outputFalse', 'outputError'],
};
const edgeNames = [...new Set(Object.values(outputs).flat())];

// Offline structural checks only; no network access, writes or code execution.
export function validateFlow(flow) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  if (!object(flow)) return ['Flow must be a JSON object.'];
  check(nonempty(flow.name), 'name must be a nonempty string.');
  if ('enabled' in flow) check(typeof flow.enabled === 'boolean', 'enabled must be boolean.');
  const walk = (value, path) => {
    if (typeof value === 'string' && (/TODO:|REPLACE_WITH_|<[A-Za-z][A-Za-z0-9_: -]*>/.test(value))) {
      errors.push(path + ': unresolved placeholder.');
    } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, path + '[' + i + ']'));
    else if (object(value)) Object.entries(value).forEach(([k, v]) => walk(v, path + '.' + k));
  };
  walk(flow, 'flow');
  const specCard = (card, path) => {
    if (!object(card)) { errors.push(path + ' must be an object.'); return; }
    check(nonempty(card.id), path + '.id must be a nonempty string.');
    check(object(card.args), path + '.args must be an object.');
    if ('inverted' in card) check(typeof card.inverted === 'boolean', path + '.inverted must be boolean.');
  };
  if (!('cards' in flow)) {
    specCard(flow.trigger, 'trigger');
    for (const key of ['conditions', 'actions']) {
      check(Array.isArray(flow[key]), key + ' must be an array.');
      if (!Array.isArray(flow[key])) continue;
      flow[key].forEach((card, i) => {
        const path = key + '[' + i + ']';
        specCard(card, path);
        if (object(card)) check((key === 'conditions' ? ['group1', 'group2', 'group3'] : ['then', 'else']).includes(card.group),
          path + '.group is invalid.');
      });
    }
    return errors;
  }
  check(!('trigger' in flow || 'actions' in flow || 'conditions' in flow),
    'Do not mix standard and advanced flow fields.');
  if (!object(flow.cards)) return [...errors, 'cards must be a UUID-keyed object.'];
  const cards = flow.cards;
  check(Object.keys(cards).length > 0, 'cards must not be empty.');
  const graph = new Map(Object.keys(cards).map(id => [id, new Set()]));
  const roots = [];
  for (const [id, card] of Object.entries(cards)) {
    check(uuid.test(id), 'Invalid card UUID: ' + id);
    if (!object(card)) { errors.push(id + ': card must be an object.'); continue; }
    if (!Object.hasOwn(outputs, card.type)) { errors.push(id + ': unknown card type.'); continue; }
    check(Number.isFinite(card.x) && Number.isFinite(card.y), id + ': x and y must be numbers.');
    if (['trigger', 'action', 'condition'].includes(card.type)) specCard(card, id);
    if (['trigger', 'start'].includes(card.type)) roots.push(id);
    if (card.type === 'note') {
      check(typeof card.value === 'string', id + ': note.value must be a string.');
      check(['yellow', 'red', 'green', 'blue'].includes(card.color), id + ': invalid note color.');
    }
    if (card.type === 'delay') {
      const delay = card.args?.delay;
      check(object(delay) && typeof delay.number === 'string' && delay.number.trim() !== '' &&
        Number.isFinite(Number(delay.number)) && Number(delay.number) >= 0 &&
        [1, 60].includes(delay.multiplier), id + ': invalid delay args.');
    }
    for (const edge of edgeNames) {
      if (!(edge in card)) continue;
      check(outputs[card.type].includes(edge), id + ': unsupported ' + edge);
      if (!Array.isArray(card[edge])) { errors.push(id + ': ' + edge + ' must be an array.'); continue; }
      for (const target of card[edge]) {
        if (typeof target !== 'string' || !Object.hasOwn(cards, target)) errors.push(id + ': missing output target.');
        else {
          check(cards[target]?.type !== 'note', id + ': output cannot target a decorative note.');
          graph.get(id).add(target);
        }
      }
    }
    if (['all', 'any'].includes(card.type)) {
      check(Array.isArray(card.input) && card.input.length > 0, id + ': input must be a nonempty array.');
      if (Array.isArray(card.input)) for (const ref of card.input) {
        const parts = typeof ref === 'string' ? ref.split('::') : [];
        const [source, edge] = parts;
        if (parts.length !== 2 || !Object.hasOwn(cards, source) ||
          !Object.hasOwn(outputs, cards[source]?.type) || !outputs[cards[source].type].includes(edge)) {
          errors.push(id + ': invalid input reference.');
        } else {
          // Join inputs are also graph edges, including exports without a redundant output array.
          graph.get(source).add(id);
        }
      }
    }
  }
  check(roots.length > 0, 'An advanced flow needs a start or trigger.');
  const reachable = new Set();
  const queue = [...roots];
  while (queue.length) {
    const id = queue.pop();
    if (reachable.has(id)) continue;
    reachable.add(id);
    queue.push(...(graph.get(id) ?? []));
  }
  for (const [id, card] of Object.entries(cards)) {
    if (object(card) && card.type !== 'note') check(reachable.has(id), id + ': unreachable executable card.');
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/validate-flow.mjs <flow.json>');
    const flow = JSON.parse(readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
    const errors = validateFlow(flow);
    if (errors.length) {
      console.error(errors.map(e => '- ' + e).join('\n'));
      process.exitCode = 1;
    } else {
      console.log('Structure passed. Live card/argument/device/zone/token checks are still required.');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
