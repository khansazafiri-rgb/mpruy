# Medical and physical references

Used in the in-app explanations (`src/sim/references.js`) and in model parameter choices.
PMIDs were matched in PubMed on 2026-11-07. The simulator remains an educational approximation;
these sources support the teaching statements, not the numerical fidelity of the simulation.

## Pathology scenarios
- **R1** McDonagh TA, Metra M, Adamo M, et al. 2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure. *Eur Heart J.* 2021;42(36):3599-3726. doi:10.1093/eurheartj/ehab368 (HFrEF definition, LVEF ≤ 40%).
- **R2** Heidenreich PA, Bozkurt B, Aguilar D, et al. 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure. *Circulation.* 2022;145(18):e895-e1032. doi:10.1161/CIR.0000000000001063.
- **R3** Lang RM, Badano LP, Mor-Avi V, et al. Recommendations for cardiac chamber quantification by echocardiography in adults. *J Am Soc Echocardiogr.* 2015;28(1):1-39. PMID 25559473 (normal LVEF and volumes).
- **R4** Marcus GM, Gerber IL, McKeown BH, et al. Association between phonocardiographic third and fourth heart sounds and objective measures of left ventricular function. *JAMA.* 2005;293(18):2238-2244. PMID 15886379 (S3 and LV dysfunction).
- **R5** Roberts ME, Rahman NM, Maskell NA, et al. British Thoracic Society Guideline for pleural disease. *Thorax.* 2023;78(Suppl 3):s1-s42. doi:10.1136/thorax-2022-219784.
- **R6** Volpicelli G, Elbarbary M, Blaivas M, et al. International evidence-based recommendations for point-of-care lung ultrasound. *Intensive Care Med.* 2012;38(4):577-591. PMID 22392031 (pleural line, A-lines, effusion signs).
- **R7** Light RW. Pleural effusion. *N Engl J Med.* 2002;346(25):1971-1977. PMID 12075059.
- **R8** Camilleri M, Kuo B, Nguyen L, et al. ACG Clinical Guideline: Gastroparesis. *Am J Gastroenterol.* 2022;117(8):1197-1220. PMID 35926490 (diagnosis needs validated gastric-emptying testing).
- **R9** Bolondi L, Bortolotti M, Santi V, et al. Measurement of gastric emptying time by real-time ultrasonography. *Gastroenterology.* 1985;89(4):752-759. PMID 3896910.
- **R10** Hausken T, Svebak S, Wilhelmsen I, et al. Low vagal tone and antral dysmotility in patients with functional dyspepsia. *Psychosom Med.* 1993;55(1):12-22. doi:10.1097/00006842-199301000-00004 (ultrasound antral amplitude × frequency = motility index).

## Ultrasound physics and tissue properties
- **T1** Duck FA. *Physical Properties of Tissue: A Comprehensive Reference Book.* Academic Press; 1990.
- **T2** Culjat MO, Goldenberg D, Tewari P, Singh RS. A review of tissue substitutes for ultrasound imaging. *Ultrasound Med Biol.* 2010;36(6):861-873. PMID 20510184.
- **T3** Szabo TL. *Diagnostic Ultrasound Imaging: Inside Out.* 2nd ed. Academic Press; 2014.
- **T4** Hoskins PR, Martin K, Thrush A, eds. *Diagnostic Ultrasound: Physics and Equipment.* 3rd ed. CRC Press; 2019.

## Auscultation and physiology
- **A1** Bickley LS, et al. *Bates' Guide to Physical Examination and History Taking.* 13th ed. Wolters Kluwer; 2021 (auscultation areas, S1/S2 splitting).
- **A2** Bohadana A, Izbicki G, Kraman SS. Fundamentals of lung auscultation. *N Engl J Med.* 2014;370(8):744-751. PMID 24552321.
- **P1** Hall JE, Hall ME. *Guyton and Hall Textbook of Medical Physiology.* 14th ed. Elsevier; 2020 (cardiac cycle timing, gastric slow waves about 3/min).
- **P2** Boussuges A, Gole Y, Blanc P. Diaphragmatic motion studied by M-mode ultrasonography. *Chest.* 2009;135(2):391-400. PMID 19017880 (quiet vs deep-breathing excursion).

## Simplifications stated in the app
Straight-ray single-scattering ultrasound in a 2D slice. No refraction, aberration, side lobes, harmonics or Doppler.
Backscatter is a relative echogenicity scale. Physiological motion is procedural, not measured.
Heart, breath and bowel sounds are synthesised. The phantom is not patient data and not a validated anatomical model.
