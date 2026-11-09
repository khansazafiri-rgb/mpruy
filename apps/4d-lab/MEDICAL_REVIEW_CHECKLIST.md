# Clinical and anatomical review checklist — MEDCOEL Anatomy Live 4D Lab

_For the MEDCOEL owner and a clinician reviewer before public release. Prepared 2026-11-09 from the merged
implementation (PR #136) and measurements made in the development container._

How to use: open the preview (`RELEASE_READINESS.md` §1), go through each item, and record a decision:
**OK** / **change text** / **change model** / **remove before release**. The engineering team will not change
clinical text or parameters without a recorded decision. Nothing in this simulator has been clinically validated.

## A. Disclaimers that must stay (verify they are visible)
| Where | Text | Decision |
|---|---|---|
| Header badge (always visible) | "Simulasi edukatif · bukan alat diagnosis" | |
| Monitor captions | "SIMULASI USG EDUKATIF · bukan citra pasien · tidak untuk diagnosis"; "CT SINTETIS dari Atlas MEDCOEL · bukan citra pasien" | |
| Viewport badge | "Anatomi: Atlas MEDCOEL · kulit ilustratif · CT sintetis dari atlas" | |
| Fisiologi tab | "Gerak fisiologis prosedural: pendekatan edukatif, bukan CT 4D atau ekokardiografi terukur." | |
| Patologi tab | "Skenario adalah model pendidikan berparameter, bukan diagnosis dan bukan perangkat medis tervalidasi." | |
| Citra tab → "Asumsi & keterbatasan simulasi USG" | straight rays, single scattering, no refraction/side-lobes/harmonics/Doppler, literature tissue constants, synthetic data | |
| `/anatomy/4d-lab/data/atlas/NOTICE.txt` | "SYNTHETIC educational data … not for diagnosis" + licence | |

## B. Anatomical accuracy and recognisability
| # | Item | What to look at | Engineering facts for the reviewer | Decision |
|---|---|---|---|---|
| B1 | Overall body and organ positions | "Seluruh tubuh", "Kulit transparan", "Anatomi dalam" | Organs are the Atlas MEDCOEL models (BodyParts3D/Z-Anatomy), a 1.705 m adult male in anatomical position | |
| B2 | Left/right and cranio-caudal relations | liver right, spleen left, LV left of RA, right kidney lower than left | Verified by automated tests; please confirm visually | |
| B3 | Synthetic CT appearance | Citra → CT; Free 3D axial/coronal/sagittal; `evidence/atlas-label-slices.png` | Textbook HU per tissue, 2.5 mm voxels, light smoothing, no noise, no contrast phases; looks like a contrast-enhanced study (blood 170–220 HU) | |
| B4 | Heart chambers | Subxiphoid window; isolate "Left ventricle" | Blood pools derived from the atlas chamber shells: LV 77, RV 92, LA 67, RA 93 mL. **The LV end-diastolic volume (77 mL) is at the low end for an adult**; walls appear thick at 2.5 mm | |
| B5 | Bladder | Kandung kemih suprapubik | The atlas bladder is nearly empty: lumen 32 mL, thick wall shell 120 mL | |
| B6 | Stomach content | Antrum epigastrik | **Assumption:** fluid-filled stomach (as after a water drink) with a gas cap only in the fundus | |
| B7 | Missing structures | Lower abdomen on CT/US | The atlas has no ileum, caecum, rectum, peritoneum, pericardium or breast; these regions are "unlabelled soft tissue" (fat-like HU) | |
| B8 | Label names | Probe readout "Di tengah berkas", Anatomi structure names | Tissue labels are Indonesian + English (e.g. "Lemak / jaringan lunak tanpa label"); structure names are the atlas's English/Latin names | |
| B9 | Region / intercostal readout | Click across the chest; read "≈SIC n · linea …" | ICS levels are measured from the atlas ribs at the left parasternal line; the line names use fixed distances from the midline | |

## C. Approximate skin surface and probe contact
| # | Item | Facts | Decision |
|---|---|---|---|
| C1 | Skin shell realism | The atlas has no skin. Shell = muscle/bone envelope + assumed 8 mm (arms 5 mm) fat/skin, closing 6 mm. Labelled "kulit ilustratif" | |
| C2 | Arms against the chest | Atlas pose; mid-axillary contacts sit just below the arm; no abduction | |
| C3 | Probe contact behaviour | The probe sits on the clicked point and slides freely; angulation pivots on the contact; no ring/orbit constraints. Contacts outside the CT box are refused | |
| C4 | Chest-wall thickness | Anterior chest/abdominal wall muscle up to ≈ 30–45 mm (atlas muscles) + 8 mm assumed fat: images are attenuated, like in a muscular patient | |

## D. Standard windows (where the probe is placed)
Contacts are found automatically on the atlas body: the skin point whose ultrasound sector crosses the least
bone/aerated lung/gas toward the target. Rendered images: `evidence/atlas-us-standard-views.png`.

| # | Window | Notes | Decision |
|---|---|---|---|
| D1 | Subxiphoid 4-chamber | Clear window; used as the HFrEF teaching view | |
| D2 | Parasternal (oblique) | Partial view of the heart | |
| D3 | **Apical 4-chamber** | **Obstructed**: in this atlas body the lingula and anterior lung margins cover the apex (49 obstructed samples on the best path). Real patients are often scanned in the left lateral decubitus position, which the model cannot reproduce | |
| D4 | RUQ / Morison | Liver and kidney visible; partial rib shadowing | |
| D5 | Right posterolateral base (effusion window) | Shows lung (normal) or fluid (effusion scenario) | |
| D6 | Epigastric antrum | Fluid-filled antrum visible | |
| D7 | Anterior lung | Linear probe; pleural line / A-line pattern | |
| D8 | Suprapubic bladder | Anechoic bladder | |

## E. Synthetic ultrasound model
| # | Item | Facts | Decision |
|---|---|---|---|
| E1 | Physics scope | Straight rays, single scattering, 2-D slice, impedance reflection, attenuation, speckle, shadowing, reverberation toward the first gas reflector, posterior enhancement, gain/TGC/DR | |
| E2 | Not modelled | Refraction, speed-of-sound aberration, side lobes, harmonics, Doppler, M-mode, mirror artefact, elevation thickness | |
| E3 | Tissue constants | Literature c, ρ, α (`MEDICAL_REFERENCES.md`); backscatter is a relative teaching scale; all editable in the Citra tab | |
| E4 | Texture | Speckle has no organ-specific texture (e.g. portal triads, muscle fibres) | |

## F. Physiological motion (procedural, not measured)
| # | Item | Facts | Decision |
|---|---|---|---|
| F1 | Cardiac | Ellipsoidal radial + longitudinal shortening around the fitted LV axis; RV free wall and atrial filling/emptying. Normal model EF 58 %, **measured on the atlas LV 55.9 %** | |
| F2 | Respiration | Diaphragm map from the atlas lung bases (right dome z = 40 mm, left 22.5 mm above the xiphoid); default excursion 16 mm; chest/abdominal wall expansion; back fixed on the table | |
| F3 | Gastric | Antral peristaltic ring ≈ 3/min, 60 % radial occlusion, 2.5 mm/s, along a geodesic centre-line of the atlas stomach | |
| F4 | Which 3D structures move | Heart chambers/valves/papillary muscles, lungs, trachea, diaphragm (if loaded), liver, gallbladder, stomach, spleen, kidneys, great vessels at the heart. Coronaries and other structures are static (labelled) | |

## G. Pathology scenarios (text is English, needs translation and review)
| # | Scenario | Parameters / behaviour | Issues to decide | Decision |
|---|---|---|---|---|
| G1 | HFrEF pattern | Radial 0.11, longitudinal 0.06, LV dilation 1.18×, HR 92, S3 on. Model EF ≈ 26 %; **measured on the atlas LV 19.3 %** | The UI shows the model EF (26 %), not the measured one. The findings text refers to "apical / parasternal views", but on the atlas body the scenario opens the **subxiphoid** window (apical obstructed). The summary says "Normal phantom" | |
| G2 | Right pleural effusion | 650 mL, dependent (posterior/basal, supine), compressed lung band; reduced right-base breath sounds | Findings text mentions mirror-artefact loss and the spine sign: **the US model does not simulate mirror artefacts**, so those cues are not visible | |
| G3 | Reduced antral motility | 1.2/min, 22 % amplitude, 1.8 mm/s; motility index shown | Text states bowel sounds are unchanged on purpose | |
| G4 | References | `MEDICAL_REFERENCES.md` (R1–R10: ESC 2021, AHA/ACC/HFSA 2022, BTS 2023, ACG 2022, …) | Check currency and citation | |

## H. Auscultation (synthesised, not recordings)
| # | Item | Facts | Decision |
|---|---|---|---|
| H1 | Heart sounds | S1 (M1, T1), S2 (A2, P2) with inspiratory P2 splitting; damped oscillators. **S3 is synthesised 180 ms after S2** (`src/sim/auscultation.js`), but the HFrEF findings text says "about 140 ms" and the Auskultasi tab says "±120–180 ms": choose one value | |
| H2 | Site weighting | 15 sites from atlas ribs/landmarks; heart-sound weight depends on distance and on aerated lung between the chest wall and the heart | |
| H3 | Breath / bowel sounds | Filtered noise (vesicular, louder on inspiration); bowel gurgles; reduced over the effusion | |
| H4 | Bell / diaphragm | Low-pass / high-pass filtering only | |
| H5 | Sound quality | **Nobody has listened critically yet.** Please listen with headphones in Safari | |

## I. Release decision
| Reviewer | Role | Date | Decision (approve / approve with changes / reject) | Notes |
|---|---|---|---|---|
| | MEDCOEL owner | | | |
| | Clinician | | | |

## H. UX upgrade content (2026-11-09) — all DRAFT, needs clinical-educator sign-off
| # | Item | Where | Facts for the reviewer | Decision |
|---|---|---|---|---|
| H1 | Structure cards (lokasi, hubungan, CT, USG, fisiologi, klinis, jebakan) | Monitor → Bantuan anatomi → Terpandu → click a structure | `src/edu/structures.js`; ≈30 structures, references G1/G2/T*/R*; label-group cards state that they cover a tissue class, not a named structure | |
| H2 | Hover identification wording and provenance | Hover on CT/US | "Hati — Liver · Hepar · Sistem pencernaan · Segmentasi sintetis atlas"; unlabelled → "tidak teridentifikasi" | |
| H3 | Withheld anatomy wording | Assist panel, RUQ view | Kidney, renal pelvis and spinal cord are *tidak tersedia (tinjauan lisensi)*; the RUQ window aims at the hepatorenal liver surface and says "ginjal tidak tersedia" | |
| H4 | Auscultation guide per site (listen for / why) | Auskultasi workspace | `src/edu/auscultationGuide.js`; A1/A2/R4/R5 | |
| H5 | Adventitious sound demos (crackles, wheeze) | Auskultasi → Bunyi tambahan paru | Synthetic, labelled demo/unreviewed; crackles late inspiration, wheeze ≈400 Hz expiration. Decide: keep, revise or remove before public release | |
| H6 | Pathology cases (HFrEF, effusion, gastroparesis) | Patologi workspace | `src/edu/pathologyCases.js`: context, mechanism, findings by fidelity (model / illustrative / absent), differentials, limitations | |
| H7 | Learning modules 1–5 and quiz answers/explanations | Belajar workspace | `src/edu/modules.js`; task checks run against the simulator state; Module 1 axial task now uses liver + spleen (kidney withheld) | |
| H8 | Clinical framing | everywhere | "Latihan di simulator tidak menggantikan pelatihan klinis terawasi atau penilaian kompetensi" | |
