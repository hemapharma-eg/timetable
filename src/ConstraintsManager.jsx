import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function ConstraintsManager({ constraints, setConstraints, faculty, days, groups, courses, rooms, activities }) {
    const [type, setType] = useState('FAC_UNAVAIL_DAY');
    
    // Form states
    const [facultyId, setFacultyId] = useState('');
    const [groupId, setGroupId] = useState('');
    const [courseId, setCourseId] = useState('');
    const [roomId, setRoomId] = useState('');
    const [activityId1, setActivityId1] = useState('');
    const [activityId2, setActivityId2] = useState('');
    const [day, setDay] = useState('');
    const [maxHours, setMaxHours] = useState(2);
    const [minDays, setMinDays] = useState(2);

    const handleAdd = (e) => {
        e.preventDefault();
        let newConst = { id: Date.now().toString(), type };

        switch (type) {
            case 'FAC_UNAVAIL_DAY':
                if (!facultyId || !day) return;
                newConst = { ...newConst, facultyId, day };
                break;
            case 'FAC_MAX_DAILY':
                if (!facultyId || !maxHours) return;
                newConst = { ...newConst, facultyId, maxHours };
                break;
            case 'GROUP_UNAVAIL_DAY':
                if (!groupId || !day) return;
                newConst = { ...newConst, groupId, day };
                break;
            case 'GROUP_MAX_DAILY':
                if (!groupId || !maxHours) return;
                newConst = { ...newConst, groupId, maxHours };
                break;
            case 'GROUP_MAX_CONTINUOUS':
                if (!groupId || !maxHours) return;
                newConst = { ...newConst, groupId, maxHours };
                break;
            case 'MIN_DAYS_BETWEEN_ACTIVITIES':
                if (!courseId || !groupId || !minDays) return;
                newConst = { ...newConst, courseId, groupId, minDays };
                break;
            case 'MAX_HOURS_CONTINUOUSLY':
                if (!facultyId || !maxHours) return;
                newConst = { ...newConst, facultyId, maxHours };
                break;
            case 'PREFERRED_ROOM':
                if (!courseId || !roomId) return;
                newConst = { ...newConst, courseId, roomId };
                break;
            case 'SAME_STARTING_TIME':
                if (!activityId1 || !activityId2 || activityId1 === activityId2) return;
                newConst = { ...newConst, activityId1, activityId2 };
                break;
            default:
                return;
        }
        
        setConstraints([...constraints, newConst]);
    };

    const renderConstraintString = (c) => {
        const fac = faculty?.find(f => f.id === c.facultyId)?.name || 'Unknown Faculty';
        const grp = groups?.find(g => g.id === c.groupId)?.name || 'Unknown Group';
        const crs = courses?.find(s => s.id === c.courseId)?.name || 'Unknown Course';
        const rm = rooms?.find(r => r.id === c.roomId)?.name || 'Unknown Room';

        if (c.type === 'FAC_UNAVAIL_DAY') return <><span className="font-bold">{fac}</span> is unavailable on {c.day}</>;
        if (c.type === 'FAC_MAX_DAILY') return <><span className="font-bold">{fac}</span> max {c.maxHours} hours/day</>;
        if (c.type === 'GROUP_UNAVAIL_DAY') return <><span className="font-bold">{grp}</span> is unavailable on {c.day}</>;
        if (c.type === 'GROUP_MAX_DAILY') return <><span className="font-bold">{grp}</span> max {c.maxHours} hours/day</>;
        if (c.type === 'GROUP_MAX_CONTINUOUS') return <><span className="font-bold">{grp}</span> max {c.maxHours} continuous hours</>;
        if (c.type === 'MIN_DAYS_BETWEEN_ACTIVITIES') return <><span className="font-bold">{crs}</span> for <span className="font-bold">{grp}</span> min {c.minDays} days apart</>;
        if (c.type === 'MAX_HOURS_CONTINUOUSLY') return <><span className="font-bold">{fac}</span> max {c.maxHours} continuous hours</>;
        if (c.type === 'PREFERRED_ROOM') return <><span className="font-bold">{crs}</span> highly prefers <span className="font-bold">{rm}</span></>;
        if (c.type === 'SAME_STARTING_TIME') return <>Activities <span className="font-bold text-xs">{c.activityId1.substring(0,6)}</span> & <span className="font-bold text-xs">{c.activityId2.substring(0,6)}</span> start same time</>;
        return 'Unknown Constraint';
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Constraints Framework</h3>
            <form onSubmit={handleAdd} className="flex gap-4 mb-6 flex-wrap items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
                    <select value={type} onChange={e => {
                        setType(e.target.value);
                        setFacultyId(''); setGroupId(''); setCourseId(''); setRoomId(''); setActivityId1(''); setActivityId2(''); setDay('');
                    }} className="px-4 py-2 border border-slate-300 rounded-lg bg-white">
                        <option value="FAC_UNAVAIL_DAY">Faculty Unavailable Day</option>
                        <option value="FAC_MAX_DAILY">Faculty Max Daily Hours</option>
                        <option value="MAX_HOURS_CONTINUOUSLY">Faculty Max Hours Continuously</option>
                        <option value="GROUP_UNAVAIL_DAY">Student Group Unavailable Day</option>
                        <option value="GROUP_MAX_DAILY">Student Group Max Daily Hours</option>
                        <option value="GROUP_MAX_CONTINUOUS">Student Group Max Hours Continuously</option>
                        <option value="MIN_DAYS_BETWEEN_ACTIVITIES">Min Days Between Activities (Course)</option>
                        <option value="PREFERRED_ROOM">Preferred Room (Course)</option>
                        <option value="SAME_STARTING_TIME">Same Starting Time</option>
                    </select>
                </div>
                
                {['FAC_UNAVAIL_DAY', 'FAC_MAX_DAILY', 'MAX_HOURS_CONTINUOUSLY'].includes(type) && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Faculty</label>
                        <select required value={facultyId} onChange={e => setFacultyId(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
                            <option value="">Select Faculty</option>
                            {faculty?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                )}

                {['GROUP_UNAVAIL_DAY', 'MIN_DAYS_BETWEEN_ACTIVITIES', 'GROUP_MAX_DAILY', 'GROUP_MAX_CONTINUOUS'].includes(type) && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Group</label>
                        <select required value={groupId} onChange={e => setGroupId(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
                            <option value="">Select Group</option>
                            {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                )}

                {['MIN_DAYS_BETWEEN_ACTIVITIES', 'PREFERRED_ROOM'].includes(type) && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Course</label>
                        <select required value={courseId} onChange={e => setCourseId(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
                            <option value="">Select Course</option>
                            {courses?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}

                {['PREFERRED_ROOM'].includes(type) && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Room</label>
                        <select required value={roomId} onChange={e => setRoomId(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
                            <option value="">Select Room</option>
                            {rooms?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                )}

                {['FAC_UNAVAIL_DAY', 'GROUP_UNAVAIL_DAY'].includes(type) && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Day</label>
                        <select required value={day} onChange={e => setDay(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
                            <option value="">Select Day</option>
                            {days?.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                )}

                {['FAC_MAX_DAILY', 'MAX_HOURS_CONTINUOUSLY', 'GROUP_MAX_DAILY', 'GROUP_MAX_CONTINUOUS'].includes(type) && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Max Hours</label>
                        <input type="number" min="1" max="10" required value={maxHours} onChange={e => setMaxHours(parseInt(e.target.value) || 2)} className="px-4 py-2 border rounded-lg w-24" />
                    </div>
                )}

                {['MIN_DAYS_BETWEEN_ACTIVITIES'].includes(type) && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Min Days</label>
                        <input type="number" min="1" max="7" required value={minDays} onChange={e => setMinDays(parseInt(e.target.value) || 1)} className="px-4 py-2 border rounded-lg w-24" />
                    </div>
                )}

                {['SAME_STARTING_TIME'].includes(type) && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Activity 1</label>
                            <select required value={activityId1} onChange={e => setActivityId1(e.target.value)} className="px-4 py-2 border rounded-lg bg-white max-w-[150px]">
                                <option value="">Act 1...</option>
                                {activities?.map(a => <option key={a.id} value={a.id}>{a.id.substring(0,6)} - {faculty?.find(f=>f.id===a.facultyId)?.name.split(' ')[0]}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Activity 2</label>
                            <select required value={activityId2} onChange={e => setActivityId2(e.target.value)} className="px-4 py-2 border rounded-lg bg-white max-w-[150px]">
                                <option value="">Act 2...</option>
                                {activities?.map(a => <option key={a.id} value={a.id}>{a.id.substring(0,6)} - {faculty?.find(f=>f.id===a.facultyId)?.name.split(' ')[0]}</option>)}
                            </select>
                        </div>
                    </>
                )}

                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center h-10 ml-auto">
                    <Plus size={18} className="mr-2" /> Add
                </button>
            </form>

            <ul className="space-y-2">
                {constraints?.map(c => (
                    <li key={c.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors">
                        <div className="flex items-center space-x-3">
                           <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">{c.type}</span>
                           <span className="text-slate-700">{renderConstraintString(c)}</span>
                        </div>
                        <button type="button" onClick={() => setConstraints(constraints.filter(x => x.id !== c.id))} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={16} />
                        </button>
                    </li>
                ))}
                {(!constraints || constraints.length === 0) && <p className="text-sm text-slate-400 text-center py-4">No custom constraints added.</p>}
            </ul>
        </div>
    );
}
