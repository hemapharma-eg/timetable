import re

with open('src/RiskManagement.jsx', 'r') as f:
    content = f.read()

# 1. Mock data
content = re.sub(
    r'Impact: \d+,\s*Appetite: \d+,',
    r'risk_scope: "Institution", programs: "", rubric_green: "< 3", rubric_yellow: ">= 3 && value < 6", rubric_orange: ">= 6 && value < 8", rubric_red: ">= 8",',
    content
)
content = re.sub(r'let mockKRIs = \[\];.*?let mockKRIRubrics = \[\];', r'let mockRiskValues = [];', content, flags=re.DOTALL)

# 2. RiskFormFields
old_fields = r"""        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Owner</label>
          <input type="text" name="Risk_Owner" value={formData.Risk_Owner || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Impact \(Numeric\)</label>
          <input type="number" name="Impact" value={formData.Impact \|\| ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Appetite \(Numeric\)</label>
          <input type="number" name="Appetite" value={formData.Appetite \|\| ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>"""

new_fields = """        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Risk Owner</label>
          <input type="text" name="Risk_Owner" value={formData.Risk_Owner || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Scope <span className="text-red-500">*</span></label>
          <select name="risk_scope" required value={formData.risk_scope || 'Institution'} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none">
            <option value="Institution">Institution</option>
            <option value="Program Level">Program Level</option>
          </select>
        </div>
        {formData.risk_scope === 'Program Level' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Programs (comma separated) <span className="text-red-500">*</span></label>
            <input type="text" name="programs" required value={formData.programs || ''} onChange={handleChange} placeholder="e.g. BSc Pharmacy, MSc Pharmacy" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
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
        </div>"""

content = re.sub(old_fields, new_fields, content)

# 3. Form States and submit
content = re.sub(
    r"Impact: '', Appetite: ''",
    r"risk_scope: 'Institution', programs: '', rubric_green: '', rubric_yellow: '', rubric_orange: '', rubric_red: ''",
    content
)
content = re.sub(
    r"payload\.Impact = .*?payload\.Appetite = .*?;",
    r"",
    content,
    flags=re.DOTALL
)

# 4. Import / Export
content = re.sub(
    r"Impact: r\.Impact \|\| '',\s*Appetite: r\.Appetite \|\| '',",
    r"Scope: r.risk_scope || '', Programs: r.programs || '', Green: r.rubric_green || '', Yellow: r.rubric_yellow || '', Orange: r.rubric_orange || '', Red: r.rubric_red || '',",
    content
)
content = re.sub(
    r"Impact: r\.Impact \? Number\(r\.Impact\) : null,\s*Appetite: r\.Appetite \? Number\(r\.Appetite\) : null,",
    r"risk_scope: r.Scope || r.risk_scope || 'Institution', programs: r.Programs || r.programs || '', rubric_green: r.Green || r.rubric_green || '', rubric_yellow: r.Yellow || r.rubric_yellow || '', rubric_orange: r.Orange || r.rubric_orange || '', rubric_red: r.Red || r.rubric_red || '',",
    content
)

with open('src/RiskManagement.jsx', 'w') as f:
    f.write(content)

