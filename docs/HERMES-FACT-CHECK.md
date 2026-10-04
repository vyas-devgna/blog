# HERMES article revision — 2026-10-04

Source: the author's supplied eight-page `Research_Paper_Hermes.pdf`, read in full, with visual inspection of Tables I–III and the architecture/replay pages. The published chapter abstract at DOI `10.1007/978-3-032-22062-2_24` is a separate source/version. The PDF itself was not uploaded or published.

| Claim                         | Evidence and handling                                                                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture / hardware       | Manuscript Sections IV–V: two-stage rule/DNN pipeline; two Pi 5 nodes, K3s, Redis, model manager; 8-bit TFLite conversion and ONNX inference. Explained as reported implementation, not reproduced experiments. |
| 94.7%                         | Table I reports accuracy; Section VIII.B separately reports 94.7% held-out-attack detection. Article and portfolio labels distinguish these.                                                                    |
| Baseline accuracy improvement | Table I: 94.7 − 85.9 = 8.8 percentage points versus Suricata, not the prose's 12.3% absolute improvement.                                                                                                       |
| False-positive rate           | Table III: 392 / 43,239 = 0.9066%; manuscript prose 0.8%, published abstract 0.9%. Explicit discrepancy, not silently harmonised.                                                                               |
| Matrix / summary mismatch     | Table III implies 98.09% accuracy, 0.990 precision, 0.970 recall, 0.980 F1; Table I reports 94.7%, 0.932, 0.921, 0.926. Matrix labelled CIC-IDS2017; exact relationship to summary remains unspecified.         |
| Power                         | Table II: HERMES 4.2 W/node, DNN-only 5.4, Suricata 4.6, Snort 3.8; 22.2% less than DNN-only. Supplied manuscript has no x86 comparison row supporting its 67% headline claim.                                  |
| Latency                       | Table II 2.4 versus 3.1 ms gives 22.6% reduction. Figure 3 discussion uses a different 15 kpps comparison, approximately 2.8 versus 4.2 ms. Do not mix operating points.                                        |
| Split / zero-day              | Section VI: chronological 70/15/15 plus final-20%-span holdout description; relationship unspecified. Variants and held-out attacks do not prove arbitrary production zero-day detection.                       |
| Robustness                    | Section VIII.A reports feature-space FGSM/PGD up to epsilon 0.1, 89.3% versus 67.2%; bounded to that reported setup.                                                                                            |
| Privacy / reproducibility     | Privacy section has no quantified privacy accounting. Raw logs, split manifests and binaries were not supplied. No independent benchmark, privacy guarantee or production-readiness claim is made.              |

Corrections are sourced reporting and arithmetic, not edits to the research paper. Resolving manuscript inconsistencies requires the experiment records or a clarified final version.
