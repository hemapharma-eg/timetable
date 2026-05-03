-- Migration Script to populate Benchmarking Master Tables with Initial Data

-- 1. Insert Universities
INSERT INTO public.benchmarking_universities (name, abbr)
VALUES 
    ('Gulf Medical University (GMU)', 'GMU'),
    ('Mohammed Bin Rashid University (MBRU)', 'MBRU'),
    ('Dubai Medical University', 'DMU'),
    ('RAKMHSU', 'RAK'),
    ('Battejee Medical College', 'BMC'),
    ('Royal College of Surgeons in Ireland (RCSI)', 'RCSI')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Years
INSERT INTO public.benchmarking_years (name)
VALUES 
    ('2024-2025'),
    ('2023-2024')
ON CONFLICT (name) DO NOTHING;

-- 3. Insert KPI Definitions
INSERT INTO public.benchmarking_kpis (category, name)
VALUES 
    ('Students', 'Total Enrolled Students'),
    ('Students', '% National Students'),
    ('Students', 'Student Nationalities'),
    ('Students', 'Student-to-Faculty Ratio'),
    ('Research', 'Research Publications'),
    ('Research', 'Publication in top 10% journals'),
    ('Research', 'Research with International Collaboration'),
    ('Graduates', 'Total Graduates (Latest)'),
    ('Graduates', 'Employability'),
    ('Ranking', 'THE World'),
    ('Ranking', 'THE Arab Region')
ON CONFLICT (category, name) DO NOTHING;

-- 4. Map and Insert Initial Values (for 2024-2025)
DO $$
DECLARE
    year_id UUID;
    uni1 UUID; uni2 UUID; uni3 UUID; uni4 UUID; uni5 UUID; uni6 UUID;
    k1 UUID; k2 UUID; k3 UUID; k4 UUID; k5 UUID; k6 UUID; k7 UUID; k8 UUID; k9 UUID; k10 UUID; k11 UUID;
BEGIN
    SELECT id INTO year_id FROM benchmarking_years WHERE name = '2024-2025';
    
    SELECT id INTO uni1 FROM benchmarking_universities WHERE name = 'Gulf Medical University (GMU)';
    SELECT id INTO uni2 FROM benchmarking_universities WHERE name = 'Mohammed Bin Rashid University (MBRU)';
    SELECT id INTO uni3 FROM benchmarking_universities WHERE name = 'Dubai Medical University';
    SELECT id INTO uni4 FROM benchmarking_universities WHERE name = 'RAKMHSU';
    SELECT id INTO uni5 FROM benchmarking_universities WHERE name = 'Battejee Medical College';
    SELECT id INTO uni6 FROM benchmarking_universities WHERE name = 'Royal College of Surgeons in Ireland (RCSI)';

    SELECT id INTO k1 FROM benchmarking_kpis WHERE name = 'Total Enrolled Students';
    SELECT id INTO k2 FROM benchmarking_kpis WHERE name = '% National Students';
    SELECT id INTO k3 FROM benchmarking_kpis WHERE name = 'Student Nationalities';
    SELECT id INTO k4 FROM benchmarking_kpis WHERE name = 'Student-to-Faculty Ratio';
    SELECT id INTO k5 FROM benchmarking_kpis WHERE name = 'Research Publications';
    SELECT id INTO k6 FROM benchmarking_kpis WHERE name = 'Publication in top 10% journals';
    SELECT id INTO k7 FROM benchmarking_kpis WHERE name = 'Research with International Collaboration';
    SELECT id INTO k8 FROM benchmarking_kpis WHERE name = 'Total Graduates (Latest)';
    SELECT id INTO k9 FROM benchmarking_kpis WHERE name = 'Employability';
    SELECT id INTO k10 FROM benchmarking_kpis WHERE name = 'THE World';
    SELECT id INTO k11 FROM benchmarking_kpis WHERE name = 'THE Arab Region';

    INSERT INTO benchmarking_values (kpi_id, year_id, values, action_plan)
    VALUES 
        (k1, year_id, jsonb_build_object(uni1, '2824', uni2, '551', uni3, '828', uni4, '1700', uni5, '1820', uni6, '5267'), ''),
        (k2, year_id, jsonb_build_object(uni1, '9.8', uni2, '27.2', uni3, '13.8', uni4, '21.1', uni5, '81.59', uni6, '32'), ''),
        (k3, year_id, jsonb_build_object(uni1, '105', uni2, '50', uni3, '52', uni4, '48', uni5, '52', uni6, '103'), 'Increase marketing efforts in North Africa and South Asia.'),
        (k4, year_id, jsonb_build_object(uni1, '11', uni2, '5', uni3, '12', uni4, '11', uni5, '9', uni6, '24'), ''),
        (k5, year_id, jsonb_build_object(uni1, '519', uni2, '401', uni3, '162', uni4, '441', uni5, '322', uni6, '1923'), 'Provide additional grants for faculty publishing in top journals.'),
        (k6, year_id, jsonb_build_object(uni1, '14.1', uni2, '26.6', uni3, '16.2', uni4, '11.4', uni5, '10.5', uni6, '30'), ''),
        (k7, year_id, jsonb_build_object(uni1, '83.4', uni2, '79.3', uni3, '72.8', uni4, '87.8', uni5, '76.7', uni6, '63.2'), ''),
        (k8, year_id, jsonb_build_object(uni1, '561', uni2, '99', uni3, '114', uni4, '247', uni5, '232', uni6, '1780'), ''),
        (k9, year_id, jsonb_build_object(uni1, '', uni2, '', uni3, '67', uni4, '48', uni5, '64', uni6, '90'), 'Establish a new alumni network to improve career placement tracking.'),
        (k10, year_id, jsonb_build_object(uni1, 'NR', uni2, 'NR', uni3, 'NR', uni4, 'NR', uni5, 'NR', uni6, '251-300'), ''),
        (k11, year_id, jsonb_build_object(uni1, '101-125', uni2, 'NR', uni3, 'NR', uni4, '151-175', uni5, 'NR', uni6, 'NA'), '')
    ON CONFLICT (kpi_id, year_id) DO NOTHING;
END $$;
