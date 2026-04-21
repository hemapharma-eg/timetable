import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function ConstraintsManager({ constraints, setConstraints, faculty, days }) {
    const [type, setType] = useState('FAC_UNAVAIL_DAY');
    const [facultyId, setFacultyId] = useState(faculty[0]?.id || '');
    const [day, setDay] = useState(days[0] || '');
    const [maxHours, setMaxHours] = useState(2);

    const handleAdd = (e) => {
        e.preventDefault();
        if (!facultyId) return;

        if (type === 'FAC_UNAVAIL_DAY' && day) {
            setConstraints([...constraints, { id: Date.now().toString(), type, facultyId, day }]);
        } else if (type === 'FAC_MAX_DAILY' && maxHours) {
            setConstraints([...constraints, { id: Date.now().toString(), type, facultyId, maxHours }]);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Constraints</h3>
            <form onSubmit={handleAdd} className="flex gap-4 mb-6 flex-wrap items-end">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
                        <option value="FAC_UNAVAIL_DAY">Faculty Unavailable Day</option>
                        <option value="FAC_MAX_DAILY">Faculty Max Daily Hours</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Faculty</label>
                    <select value={facultyId} onChange={e => setFacultyId(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
                        <option value="">Select Faculty</option>
                        {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>
                {type === 'FAC_UNAVAIL_DAY' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Day</label>
                        <select value={day} onChange={e => setDay(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
                            <option value="">Select Day</option>
                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                )}
                {type === 'FAC_MAX_DAILY' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Max Hours</label>
                        <input type="number" min="1" max="10" value={maxHours} onChange={e => setMaxHours(parseInt(e.target.value) || 2)} className="px-4 py-2 border rounded-lg w-24" />
                    </div>
                )}
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center h-10">
                    <Plus size={18} className="mr-2" /> Add
                </button>
            </form>

            <ul className="space-y-2">
                {constraints.map(c => {
                    const fac = faculty.find(f => f.id === c.facultyId)?.name || 'Unknown';
                    return (
                        <li key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-700">
                                {c.type === 'FAC_UNAVAIL_DAY' ? <><span className="font-bold">{fac}</span> is unavailable on {c.day}</> : <><span className="font-bold">{fac}</span> max {c.maxHours} hours/day</>}
                            </span>
                            <button type="button" onClick={() => setConstraints(constraints.filter(x => x.id !== c.id))} className="text-red-400 hover:text-red-600 p-1">
                                <Trash2 size={16} />
                            </button>
                        </li>
                    );
                })}
                {constraints.length === 0 && <p className="text-sm text-slate-400">No constraints.</p>}
            </ul>
        </div>
    );
}
