---
paper_id: su2021-roformer
title: "RoFormer: Enhanced Transformer with Rotary Position Embedding"
authors: [J. Su, Y. Lu, S. Pan, A. Murtadha, B. Wen, Y. Liu]
year: 2021
url: https://arxiv.org/pdf/2104.09864
created: 2026-08-23
relevant_atlas_pages: [attention-mechanism, vit]
---

# Setting

Problem class: how to inject token-position information into transformer
self-attention so that the query/key inner product depends on the *relative*
position of the two tokens (not the absolute positions), while keeping the
mechanism compatible with both quadratic softmax attention and linear
(kernelized) attention.

Inputs: a sequence of $N$ token embeddings $x_i \in \mathbb{R}^d$, indices
$m, n \in \{1,\dots,N\}$. Standard self-attention first lifts embeddings to
position-aware queries/keys/values via functions $f_q, f_k, f_v$ (Eq. 1),
then computes softmax attention weights over the resulting $q_m^\top k_n$
scores (Eq. 2).

Outputs: a concrete choice of $f_q, f_k$ (rotary position embedding, RoPE)
that (a) satisfies a relative-position constraint on the inner product
exactly, (b) requires no extra learned parameters (the rotation angles are
fixed, precomputed from position and channel index), (c) leaves $f_v$
untouched (values carry no position information), and (d) composes with
linear-attention kernels — unlike prior additive relative-position schemes.

# Core idea

The paper poses position encoding as a functional-equation problem: find
$f_q, f_k$ such that the inner product $\langle f_q(x_m,m), f_k(x_n,n)\rangle$
equals some function $g$ of $(x_m, x_n, m-n)$ only — i.e., depends on the two
embeddings and their relative offset, never on $m, n$ individually (Eq. 11).
In the $d=2$ case, treating vectors as complex numbers, the unique solution
(up to a free constant fixed by matching the position-0 case to the standard
un-encoded projections $W_q x_m$, $W_k x_n$) is $f_q(x_m,m) = (W_q x_m)e^{im\theta}$,
$f_k(x_n,n) = (W_k x_n)e^{in\theta}$ (Eq. 12) — i.e., *rotate* the
affine-projected embedding by an angle proportional to its position, rather
than *add* a position vector to the embedding as every prior scheme
(sinusoidal Vaswani et al., learned-absolute BERT/GPT, Shaw/Transformer-XL/T5/DeBERTa
relative schemes) does. Equivalently, $f_{\{q,k\}}(x_m,m) = R^{(2)}_{\theta m} W_{\{q,k\}} x_m$
for the $2\times2$ rotation matrix $R^{(2)}_{\theta m} = \begin{psmallmatrix}\cos m\theta & -\sin m\theta\\ \sin m\theta & \cos m\theta\end{psmallmatrix}$
(Eq. 13). For general even $d$, the $d$-dimensional space is split into $d/2$
independent 2D sub-planes, each rotated by its own angle $m\theta_i$, giving
a sparse block-diagonal orthogonal matrix $R^d_{\Theta,m}$ (Eq. 15) with
$\Theta = \{\theta_i = 10000^{-2(i-1)/d}, i \in [1,\dots,d/2]\}$ — the same
geometric base (10000) and per-pair frequency schedule as Vaswani's
sinusoidal PE (Eq. 4), reused here as *rotation* frequencies instead of
*additive* phase arguments. Applying this to both query and key makes
$q_m^\top k_n = x_m^\top W_q^\top R^d_{\Theta,n-m} W_k x_n$ (Eq. 16) — the
score depends on $n-m$ only through the *relative* rotation
$R^d_{\Theta,n-m} = (R^d_{\Theta,m})^\top R^d_{\Theta,n}$, an orthogonal
matrix (numerically stable — no norm growth from the position term). Because
rotation preserves vector norm, RoPE composes with linear attention by
rotating the outputs of the non-negative feature maps $\phi(q_m), \phi(k_n)$
before the kernel product, instead of rotating $q,k$ themselves (Eq. 19,
§3.3) — additive relative-PE schemes cannot do this because they alter the
expanded bilinear terms of Eq. 6, which don't factor through a linear kernel.
A separate derivation (§3.4.3, Eq. 35–37, Fig. 2) shows the inner product,
written as a sum of $d/2$ per-pair complex terms, is bounded via an Abel
(summation-by-parts) transformation by $\max_i|h_{i+1}-h_i| \cdot \sum_i
|S_{i+1}|$, where $S_j = \sum_{i<j} e^{i(m-n)\theta_i}$; with $\theta_i =
10000^{-2i/d}$, the average partial-sum magnitude $\frac{1}{d/2}\sum_i|S_i|$
empirically decays as $|m-n|$ grows (Fig. 2 plots this decreasing bound
against relative distance up to 250) — giving RoPE a built-in long-term
decay of attention with relative distance, "for free," with no extra term.

# Assumptions

1. $d$ (the per-head embedding dimension being rotary-encoded) is even —
   the construction pairs channels into $d/2$ 2D sub-planes (Eq. 14–15). Hard
   requirement of the construction as presented.
2. The relative-position constraint (Eq. 11) is imposed only on the
   query/key inner product; $f_v$ is left position-free by design (stated
   directly under Eq. 7's discussion and implicit throughout §3) — RoPE does
   not encode position into values.
3. The 2D derivation (§3.4.1) assumes $\theta$ is a *non-zero* real constant
   shared by query and key branches (stated after Eq. 12); the initial
   condition $f_q(x_q,0) = W_q x_q$ (Eq. 32) fixes the free integration
   constant $\gamma$ to 0 in Eq. 31, tying RoPE's output at position 0 to
   the ordinary (position-free) linear projection.
4. Long-term decay (§3.4.3) is a property of the *chosen* frequency schedule
   $\theta_i = 10000^{-2i/d}$, not of rotary encoding in general — a
   different, non-decreasing choice of $\{\theta_i\}$ would not necessarily
   decay. The paper borrows the schedule from Vaswani's sinusoidal PE (Eq. 4)
   without an independent optimality argument beyond the empirical decay
   plot (Fig. 2) and downstream results.
5. Practical/implementation note (not explicitly separated as an assumption
   in the paper, but implicit in Eq. 34): although $R^d_{\Theta,m}$ is
   presented as a matrix product (Eq. 14, 16), the sparse block-diagonal
   structure is intended to be applied as an elementwise
   multiply-and-rotate-pairs operation (Eq. 34), not literal dense matrix
   multiplication — the paper flags direct dense multiplication as
   "not computationally efficient" (text following Eq. 16).

# Failure regime

- The paper's own §4.5.5 "Limitations of the work" states two open gaps: (1)
  despite the rotation-based relative-position formalism, there is no
  theoretical explanation for why RoFormer converges *faster* in
  pre-training than baselines using other position-encoding strategies; (2)
  despite proving the long-term decay property (shared qualitatively with
  prior relative-PE schemes), the paper has no faithful explanation for why
  RoFormer specifically outperforms peer models on *long* texts.
- Mixed empirical results on GLUE (Table 2): RoFormer beats BERT on
  MRPC, STS-B, QQP but *underperforms* on SST-2, QNLI, and both MNLI splits
  — "significantly outperform… in three out of six datasets" (§4.3.3), not a
  uniform win. This qualifies the abstract's "consistently overcomes its
  alternatives" claim, which appears to refer specifically to the long-text
  classification benchmarks, not GLUE.
- No stated failure mode for the $d$-odd case; the construction as given
  (Eq. 14–15) simply does not define an unpaired trailing dimension.

# Numerical sensitivity

- $R^d_{\Theta,m}$ is exactly orthogonal by construction (block-diagonal 2D
  rotations), so it cannot inflate or shrink vector norms regardless of
  position magnitude $m$ — the paper explicitly calls this out as ensuring
  "stability during the process of encoding position information" (text
  after Eq. 16). This is the numerical-safety argument in the paper for why
  rotary encoding is preferable to additive encoding at long sequence
  lengths (no unbounded position-vector norm growth to fight against).
  Contrast with additive absolute PE (Eq. 3–4), where $p_i$ is summed
  directly into the embedding and can shift its effective scale.
- Frequency schedule $\theta_i = 10000^{-2(i-1)/d}$ spans a wide dynamic
  range across $i=1,\dots,d/2$ (near 1 for low $i$, near $10^{-4\cdot(d/2-1)/d}$
  for high $i$) — same geometric progression as sinusoidal PE (Eq. 4), so it
  inherits that scheme's implicit numerical range without additional
  discussion in this paper.
- Direct dense-matrix realization of $R^d_{\Theta,m}$ is flagged as
  computationally (not numerically) inefficient due to sparsity (text after
  Eq. 16); the paper gives the efficient elementwise realization in Eq. 34.
- Eq. 34's efficient form multiplies the embedding split into even/odd
  interleaved channels against precomputed $\cos m\theta_i$ / $\sin m\theta_i$
  vectors — no explicit statement on precision (fp16 vs fp32) requirements
  for $m\theta_i$ at large $m$; not addressed in the paper (`?`).

# Applicability

- Use when: building or modifying transformer self-attention and relative
  position dependence is desired without adding parameters and without
  altering the additive bilinear-expansion structure of prior relative-PE
  methods; especially relevant when the attention kernel must remain linear
  (kernelized/linear attention, §3.3) since RoPE is (per the paper) the only
  scheme among those surveyed shown compatible with that setting.
- Use when: long-sequence / long-document tasks are the target — the paper's
  own evaluation (Chinese long-text pretraining, CAIL2019-SCM at 512 vs 1024
  tokens, Table 4–5) is explicitly built around long-text generalization,
  and sequence-length flexibility is claimed as a RoPE property in the
  abstract and §1 contributions.
- Don't use when (not stated by the paper as a "don't," but inferable from
  scope): the task needs the position signal *decoupled* from content
  interaction entirely — RoPE necessarily entangles position with the
  content-dependent query/key rotation (it is multiplicative on $q,k$
  themselves), whereas some additive schemes isolate a pure content-content
  term plus separate position-position bias terms (e.g. Eq. 8's $b_{i,j}$
  in T5). Not discussed as a limitation by the paper itself — flagged here
  as an inference (`?`).
- Compared against (paper's own baselines, §4): vanilla Transformer
  (Vaswani sinusoidal absolute PE) on WMT14 En-De machine translation;
  BERT (learned absolute PE) on MLM pretraining loss and GLUE fine-tuning;
  Performer (linear attention) with vs without RoPE on Enwik8 language
  modeling; WoBERT and NEZHA (Chinese pretrained models, absolute and
  relative PE respectively) on Chinese long-text matching.

# Connections

- Builds on: sinusoidal absolute PE [Vaswani et al. 2017, cited as
  Vaswani et al. [2017] throughout §2.2] — RoPE reuses its frequency base
  10000 and per-channel-pair schedule (Eq. 4 vs Eq. 15), repurposed from an
  additive term to a multiplicative rotation angle. Also positions itself
  against the additive relative-PE lineage: Shaw et al. 2018 (Eq. 5),
  Transformer-XL / Dai et al. 2019 (Eq. 6–7), T5 / Raffel et al. 2020 (Eq. 8–9),
  DeBERTa / He et al. 2020 (Eq. 10) — all surveyed in §2.3 as prior
  approaches RoPE improves on by deriving the encoding directly from the
  relative-position constraint (Eq. 11) rather than post-hoc modifying the
  additive decomposition of Eq. 6.
- Enables: linear/kernelized attention with relative position encoding —
  demonstrated by combining RoPE with Performer (Choromanski et al. 2020) in
  §4.4, which the paper states prior additive relative-PE schemes could not
  support cleanly (§1, "render them unsuitable for the linear self-attention
  architecture").
- Refutes / supersedes: none named explicitly as refuted; the paper frames
  itself as an alternative/improvement over the additive relative-PE family
  rather than a refutation of any single prior method.

# Atlas update plan

## NEW: positional-encoding
Type: concept
Category: attention / transformer building blocks
Primary source: this paper (su2021-roformer); to be synthesized alongside
the Vaswani sinusoidal-PE source and at least one more source per the
concept-page ≥3-source rule.
Bullets per public-page section:
- **Definition**: position encoding is any mechanism that breaks the
  permutation-invariance of self-attention by making $f_q, f_k, f_v$
  depend on token index, not just token content (Eq. 1). Two families:
  additive (position vector summed into the embedding, Eq. 3) and
  multiplicative/rotary (position rotates the query/key vector, Eq. 12–14).
- **Mathematical description**: state the relative-position desideratum
  $\langle f_q(x_m,m), f_k(x_n,n)\rangle = g(x_m,x_n,m-n)$ (Eq. 11) as the
  organizing constraint; walk the 2D complex-rotation solution (Eq. 12–13)
  and its derivation via polar decomposition (Eq. 20–33, esp. the arithmetic-
  progression argument Eq. 28–30 that forces the angular part to be linear
  in position, $\phi(m) = m\theta + \gamma$); generalize to the $d$-dimensional
  block-diagonal rotation matrix (Eq. 14–15) with frequency schedule
  $\theta_i = 10000^{-2(i-1)/d}$; give the efficient elementwise realization
  (Eq. 34).
- **Numerical concerns**: rotation matrices are exactly orthogonal — no
  norm inflation with position magnitude, contrast with additive schemes
  whose position vector directly perturbs embedding scale (paper's own
  stability argument, text after Eq. 16); frequency schedule spans a wide
  geometric range across channel pairs, inherited unchanged from sinusoidal
  PE (Eq. 4 vs Eq. 15).
- **Where it appears**: cite RoPE's long-term decay property (Eq. 35–37,
  Fig. 2 — Abel-transformation bound on the inner product showing average
  decay with $|m-n|$ for the $10000^{-2i/d}$ schedule) and its composability
  with linear attention (Eq. 19, §3.3) as the two properties that made it
  become, per this paper's framing, applicable beyond quadratic softmax
  attention — this is the technical grounding for why later architectures
  (LLaMA-family, ViT variants, etc. — verify via later sources before
  claiming adoption) chose RoPE over sinusoidal/learned-absolute PE.
- **Contrast to record explicitly**: sinusoidal PE (Vaswani et al., Eq. 4)
  is ADDED to the token embedding before the linear projections; RoPE
  ROTATES the already-projected query and key vectors (Eq. 12, 14) — position
  enters the attention score multiplicatively through $R^d_{\Theta,n-m}$
  (Eq. 16), and the value vectors $v_n$ remain entirely position-free
  (paper never modifies $f_v$). This is the single most load-bearing
  distinction for the concept page's framing.
Relations: none — concept-page source; no typed relations (approved plan).

## UPDATE: attention-mechanism
Section: Remarks (survey paragraph on efficiency/position treatments)
- The qualitative claim that rotary position embedding is the dominant
  modern positional treatment for self-attention now has a proper primary
  source: su2021-roformer. Cite RoPE's two headline properties from this
  paper — the multiplicative rotation formulation that leaves values
  position-free (Eq. 12–16) and long-term decay of attention weight with
  relative distance (Eq. 35–37, Fig. 2) — as the technical justification,
  rather than stating the fact unsourced.
Relations: none — concept-page source; no typed relations (approved plan).

# Provenance

- Eq. (1): position-aware query/key/value projections $q_m=f_q(x_m,m)$,
  $k_n=f_k(x_n,n)$, $v_n=f_v(x_n,n)$ — §2.1.
- Eq. (2): softmax attention weights $a_{m,n}$ and output $o_m$ — §2.1.
- Eq. (3): general additive absolute-PE form $f_t(x_i,i) := W_t(x_i+p_i)$ — §2.2.
- Eq. (4): Vaswani sinusoidal PE, $p_{i,2t}=\sin(k/10000^{2t/d})$,
  $p_{i,2t+1}=\cos(k/10000^{2t/d})$ — §2.2.
- Eq. (5): Shaw et al. relative-PE variant with clipped relative distance
  $r=\mathrm{clip}(m-n,r_{min},r_{max})$ — §2.3.
- Eq. (6): Transformer-XL-style decomposition of $q_m^\top k_n$ into four
  terms — §2.3.
- Eq. (7): refined decomposition distinguishing content/location key
  weights $W_k, \widetilde{W}_k$ — §2.3.
- Eq. (8): T5 bias-only reformulation $q_m^\top k_n = x_m^\top W_q^\top W_k
  x_n + b_{i,j}$ — §2.3.
- Eq. (9): further T5 variant with separate projection matrices $U_q,U_k$ — §2.3.
- Eq. (10): DeBERTa-style form using only the two relative-position middle
  terms of Eq. 6 — §2.3.
- Eq. (11): the relative-position desideratum
  $\langle f_q(x_m,m),f_k(x_n,n)\rangle = g(x_m,x_n,m-n)$ — §3.1, the paper's
  central formulation.
- Eq. (12): 2D solution $f_q(x_m,m)=(W_qx_m)e^{im\theta}$,
  $f_k(x_n,n)=(W_kx_n)e^{in\theta}$, and $g$ in complex/Re[] form — §3.2.1.
- Eq. (13): matrix form of Eq. 12 with the $2\times2$ rotation matrix — §3.2.1.
- Eq. (14): general-$d$ form $f_{\{q,k\}}(x_m,m)=R^d_{\Theta,m}W_{\{q,k\}}x_m$ — §3.2.2.
- Eq. (15): block-diagonal rotation matrix $R^d_{\Theta,m}$ and frequency
  set $\Theta=\{\theta_i=10000^{-2(i-1)/d}, i\in[1,\dots,d/2]\}$ — §3.2.2.
  Figure 1 gives the accompanying schematic.
- Eq. (16): $q_m^\top k_n = x_m^\top W_q^\top R^d_{\Theta,n-m} W_k x_n$,
  $R^d_{\Theta,n-m}=(R^d_{\Theta,m})^\top R^d_{\Theta,n}$, orthogonality
  and stability remark — §3.2.2, text immediately following.
- Eq. (17)–(18): general attention form and linear-attention reformulation
  (citing Katharopoulos et al. 2020, Shen et al. 2021) — §3.3.
- Eq. (19): RoPE combined with linear attention via rotating $\phi(q_m),
  \phi(k_n)$ before the kernel product — §3.3, "RoPE with linear attention."
- Eq. (20)–(33), §3.4.1 "Derivation of RoPE under 2D": full polar-form
  derivation; key intermediate steps — Eq. (21) restates the constraint,
  Eq. (22) initial condition, Eq. (23) complex polar decomposition,
  Eq. (24)/(26a,b) relations from setting $m=n$, Eq. (27) radial-part
  solution (position-independent), Eq. (28)–(30) angular-part solution
  forced into an arithmetic progression $\phi(m)=m\theta+\gamma$, Eq. (31)
  general solution, Eq. (32) boundary definitions $q=W_qx_m$, $k=W_kx_n$,
  Eq. (33) final form with $\gamma=0$.
- Eq. (34), §3.4.2 "Computational efficient realization": elementwise
  rotate-pairs formula for applying $R^d_{\Theta,m}$ without dense matrix
  multiplication.
- Eq. (35)–(37), Fig. 2, §3.4.3 "Long-term decay of RoPE": inner product as
  a sum of per-pair complex terms (Eq. 35), Abel-transformation rewrite
  (Eq. 36), and the resulting bound
  $|\sum_i q_{[2i:2i+1]}k^*_{[2i:2i+1]}e^{i(m-n)\theta_i}| \le \max_i
  |h_{i+1}-h_i|\sum_i|S_{i+1}|$ (Eq. 37); decay of the average partial-sum
  magnitude with relative distance under $\theta_i=10000^{-2i/d}$ shown
  numerically in Figure 2 (curve labeled "relative upper bound" vs
  "relative distance," plotted to ~250).
- Table 1: WMT14 En-De BLEU, Transformer-base 27.3 vs RoFormer 27.5 — §4.1.3.
- Figure 3 (left): BERT vs RoFormer MLM pretraining loss curves — §4.2.3.
- Table 2: GLUE fine-tuning, BERT vs RoFormer per-task scores (MRPC 88.9/89.5,
  SST-2 93.5/90.7, QNLI 90.5/88.0, STS-B 85.8/87.0, QQP 71.2/86.4,
  MNLI(m/mm) 84.6/83.4 vs 80.2/79.8) — §4.3.3; "outperform… three out of six"
  claim is the paper's own characterization.
- Figure 3 (right), §4.4.2: Performer with vs without RoPE, Enwik8
  pretraining loss — faster convergence, lower loss with RoPE.
- Table 3: tokenization-level / PE-type cross-comparison, BERT (char, abs.),
  WoBERT (word, abs.), NEZHA (char, rel.), RoFormer (word, RoPE) — §4.5.1.
- Table 4: Chinese pretraining stages, sequence length vs accuracy — §4.5.2.
- Table 5: CAIL2019-SCM results, RoFormer-512 comparable to WoBERT-512 and
  slightly better than BERT-512; RoFormer-1024 outperforms WoBERT-1024(?
  — table only reports -512 rows for BERT/WoBERT and both -512/-1024 for
  RoFormer) by "an absolute improvement of 1.5%" per §4.5.4 text — §4.5.4,
  Table 5.
- §4.5.5 "Limitations of the work": paper's own stated open gaps (no
  theoretical explanation for faster convergence; no faithful explanation
  for long-text superiority beyond the shared decay property).
