-- Add Employability KPI to OBF Framework
-- Formula: sum(First Job Relevant Yes)/sum(First Job Relevant Yes No)*100

INSERT INTO public.obf_kpis (
    kpi_no, 
    title, 
    category, 
    description, 
    numerator_label, 
    denominator_label, 
    unit,
    rubric_green,
    rubric_yellow,
    rubric_orange,
    rubric_red
) VALUES (
    'KPI-01', 
    '% Employability in Relevant Jobs', 
    'C02', 
    'Percentage of graduates employed in jobs relevant to their field of study. Calculated as: sum(First Job Relevant Yes) / sum(First Job Relevant Yes No) * 100', 
    'First Job Relevant Yes', 
    'First Job Relevant Yes No', 
    '%',
    '>= 80',
    '>= 70 && < 80',
    '>= 60 && < 70',
    '< 60'
) ON CONFLICT (kpi_no) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    numerator_label = EXCLUDED.numerator_label,
    denominator_label = EXCLUDED.denominator_label,
    unit = EXCLUDED.unit;
