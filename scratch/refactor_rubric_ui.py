import re

with open('src/RiskManagement.jsx', 'r') as f:
    content = f.read()

# 1. Add RubricConditionBuilder component
builder_component = """
const RubricConditionBuilder = ({ colorClass, label, value, onChange }) => {
  const parseValue = (valStr) => {
    if (!valStr) return { op1: '', val1: '', op2: '', val2: '', useAnd: false };
    const parts = valStr.split('&&').map(s => s.trim());
    const parsePart = (p) => {
      // Remove 'value ' or 'val ' if present
      let cleanP = p.replace(/^value\\s+|^val\\s+/, '');
      const match = cleanP.match(/^(>=|<=|>|<|==)\\s*(-?\\d+(\\.\\d+)?)$/);
      if (match) return { op: match[1], val: match[2] };
      return { op: '', val: '' };
    };
    const p1 = parsePart(parts[0] || '');
    const p2 = parts.length > 1 ? parsePart(parts[1]) : { op: '', val: '' };
    return {
      op1: p1.op, val1: p1.val,
      useAnd: parts.length > 1,
      op2: p2.op, val2: p2.val
    };
  };

  const [state, setState] = useState(parseValue(value));

  useEffect(() => {
    setState(parseValue(value));
  }, [value]);

  const update = (updates) => {
    const next = { ...state, ...updates };
    setState(next);
    let str = '';
    if (next.op1 && next.val1) str += `${next.op1} ${next.val1}`;
    if (next.useAnd && next.op2 && next.val2) str += ` && ${next.op2} ${next.val2}`;
    onChange(str);
  };

  return (
    <div className={`p-3 rounded-lg border bg-white shadow-sm flex flex-col gap-2`}>
      <label className={`block text-xs font-bold ${colorClass}`}>{label} <span className="text-red-500">*</span></label>
      <div className="flex items-center gap-2 flex-wrap">
        <select value={state.op1} onChange={e => update({op1: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-indigo-500 bg-slate-50">
          <option value="">Op</option>
          <option value="<">&lt;</option>
          <option value="<=">&le;</option>
          <option value=">">&gt;</option>
          <option value=">=">&ge;</option>
          <option value="==">=</option>
        </select>
        <input type="number" step="any" value={state.val1} onChange={e => update({val1: e.target.value})} placeholder="Value" className="border border-slate-300 rounded p-1.5 w-20 text-sm outline-none focus:border-indigo-500" />
        
        <label className="flex items-center gap-1 text-xs text-slate-500 font-bold ml-1 cursor-pointer select-none">
          <input type="checkbox" checked={state.useAnd} onChange={e => update({useAnd: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
          AND
        </label>

        {state.useAnd && (
          <>
            <select value={state.op2} onChange={e => update({op2: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-indigo-500 bg-slate-50">
              <option value="">Op</option>
              <option value="<">&lt;</option>
              <option value="<=">&le;</option>
              <option value=">">&gt;</option>
              <option value=">=">&ge;</option>
              <option value="==">=</option>
            </select>
            <input type="number" step="any" value={state.val2} onChange={e => update({val2: e.target.value})} placeholder="Value" className="border border-slate-300 rounded p-1.5 w-20 text-sm outline-none focus:border-indigo-500" />
          </>
        )}
      </div>
    </div>
  );
};
"""

content = content.replace("function RiskFormFields", builder_component + "\nfunction RiskFormFields")

# 2. Replace the 4 text inputs grid
old_grid = """      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-emerald-700 mb-1">No Risk (Green) <span className="text-red-500">*</span></label>
          <input type="text" name="rubric_green" required value={formData.rubric_green || ''} onChange={handleChange} placeholder="e.g. < 5" className="w-full px-3 py-2 border border-emerald-300 rounded-md outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-yellow-600 mb-1">Low Prob (Yellow) <span className="text-red-500">*</span></label>
          <input type="text" name="rubric_yellow" required value={formData.rubric_yellow || ''} onChange={handleChange} placeholder="e.g. >= 5 && < 10" className="w-full px-3 py-2 border border-yellow-300 rounded-md outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-orange-600 mb-1">High Prob (Orange) <span className="text-red-500">*</span></label>
          <input type="text" name="rubric_orange" required value={formData.rubric_orange || ''} onChange={handleChange} placeholder="e.g. >= 10 && < 15" className="w-full px-3 py-2 border border-orange-300 rounded-md outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-red-700 mb-1">Incident (Red) <span className="text-red-500">*</span></label>
          <input type="text" name="rubric_red" required value={formData.rubric_red || ''} onChange={handleChange} placeholder="e.g. >= 15" className="w-full px-3 py-2 border border-red-300 rounded-md outline-none text-sm" />
        </div>
      </div>"""

new_grid = """      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <RubricConditionBuilder colorClass="text-emerald-700" label="No Risk (Green)" value={formData.rubric_green} onChange={v => handleChange({target: {name: 'rubric_green', value: v}})} />
        <RubricConditionBuilder colorClass="text-yellow-600" label="Low Prob (Yellow)" value={formData.rubric_yellow} onChange={v => handleChange({target: {name: 'rubric_yellow', value: v}})} />
        <RubricConditionBuilder colorClass="text-orange-600" label="High Prob (Orange)" value={formData.rubric_orange} onChange={v => handleChange({target: {name: 'rubric_orange', value: v}})} />
        <RubricConditionBuilder colorClass="text-red-700" label="Incident (Red)" value={formData.rubric_red} onChange={v => handleChange({target: {name: 'rubric_red', value: v}})} />
      </div>"""

content = content.replace(old_grid, new_grid)

with open('src/RiskManagement.jsx', 'w') as f:
    f.write(content)

