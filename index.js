import { readFileSync } from 'fs';
import { parse } from 'postcss';

/**
 * @typedef {object} Options
 * @property {string[]} [files] Path to file(s) containing the `@variant` declarations.
 */

/**
 * Use your custom tailwind variants as selectors inside css files without relying on the `@apply`
 * syntax.
 *
 * @type {import('postcss').PluginCreator<Options>}
 * @example
 *   ```css
 *   ⁣@variant hocus (&:hover, &:focus);
 *
 *   .btn {
 *     color: var(--color-input);
 *
 *     &:variant(hocus) {
 *       color: var(--color-input-accent);
 *     }
 *   }
 */
const plugin = ({ files = [] } = {}) => {
  /**
   * @type {Map<string, string>}
   */
  const variants = new Map();
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const parsed = parse(content);
    parsed.walkAtRules('variant', (rule) => {
      const [name, amped] = rule.params
        .substring(0, rule.params.length - 1)
        .trim()
        .split(/\s*\((.*)/);
      const unamped = amped
        .split(',')
        .map((s) => {
          const trimmed = s.trim();
          if (trimmed.startsWith('&')) {
            return trimmed.substring(1);
          }
          return trimmed;
        })
        .join(', ');
      if (variants.has(name)) {
        if (variants.get(name) === unamped) {
          console.warn(`Duplicate variant declaration found for ${name}.`);
          return;
        }
        console.error(`Conflicting variant declarations found for ${name}.`);
      }
      variants.set(name, unamped);
    });
  }
  return {
    postcssPlugin: 'postcss-tailwind-variants',
    Rule(rule) {
      if (!rule.selector || !rule.selector.toLowerCase().includes(':variant(')) {
        return;
      }
      const is = rule.selector.replace(/:variant\((.*[^\)])\)/, (_, variant) => {
        if (!variants.has(variant)) {
          rule.error(`No corresponding variant definition found for ${variant}.`);
          return variant;
        }
        return `:is(${variants.get(variant)})`;
      });
      rule.replaceWith(rule.clone({ selector: is }));
    }
  };
};

plugin.postcss = true;

export default plugin;
