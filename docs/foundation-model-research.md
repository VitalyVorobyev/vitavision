# From Attention to World Models: A Research Atlas of Modern Foundation-Model Architectures

## The field is best understood as a set of interacting research stories

The most useful way to organize the modern-model literature is **not** as a chronology of increasingly large Transformers. That description misses what actually changed. Since the mid-2010s, several partially independent research programs have repeatedly collided with one another:

| Research story | Original problem | What changed conceptually | Where the frontier has moved |
|---|---|---|---|
| **Attention and sequence modeling** | RNNs had difficulty retaining and accessing distant information | Explicit content-addressable memory → self-attention → efficient attention and KV-state management | Attention is now simultaneously an algorithm, a memory system, and a hardware kernel. citeturn0search0turn0search1turn2search0turn2search3 |
| **Scaling and conditional computation** | Larger dense networks become prohibitively expensive | Scaling laws → compute-optimal training → sparse MoE → inference-time scaling | “How much computation per token?” is becoming as important as parameter count. citeturn18search7turn18search10turn20search2turn18search0 |
| **Efficient sequence architectures** | Quadratic attention and KV caches become expensive at long context | Local/sparse attention, recurrent state, SSMs, implicit convolutions, hybrids | The clean Transformer-versus-RNN distinction is dissolving. citeturn10search0turn10search1turn10search2turn11search1 |
| **Vision** | CNN inductive biases dominated perception | Images become token sequences → hierarchical Transformers → task-general foundation representations | Foundation encoders, promptable models, multimodal semantics, and video/world prediction increasingly replace task-specific vision pipelines. citeturn5search0turn5search2turn7search1turn14search13 |
| **Multimodality** | Language, images, audio, and action had separate architectures | Shared representation spaces and cross-attention connect specialist encoders and large sequence models | Models are becoming perception-language-action systems rather than isolated modality models. citeturn8search0turn8search1turn8search2turn13search4 |
| **Generative modeling** | Autoregression is awkward for high-dimensional continuous signals | Diffusion and flow models model continuous distributions; Transformers become their scalable backbone | Transformer is no longer synonymous with autoregressive next-token prediction. citeturn19search3turn19search5turn15search8 |
| **Hardware/software co-design** | Model FLOPs, state, and communication exceed a single accelerator | Parallelism, mixed precision, IO-aware kernels, quantization, paging, rack-scale interconnect | Model architecture increasingly anticipates accelerator memory hierarchy and communication topology. citeturn4search0turn2search0turn16search0turn17search6 |
| **World models and embodied intelligence** | A predictor of symbols is not automatically an agent that understands consequences of actions | Latent dynamics → imagined control → video world models → VLA policies and predictive latent models | There are now at least three competing notions of “world model”: latent dynamics, generative simulation, and predictive representation models. citeturn15search2turn12search2turn15search0turn14search2 |

The deepest pattern across these stories is that **“architecture” has expanded beyond the neural-network block diagram**. A modern model should really be described at four levels:

**representation architecture** — tokens, patches, latent states, continuous action trajectories;  
**computation architecture** — attention, convolution, state-space recurrence, MoE routing, diffusion/flow;  
**learning architecture** — next-token prediction, masking, contrastive learning, latent prediction, RL, imitation; and  
**systems architecture** — precision, sharding, memory layout, KV caching, communication and serving.

Many apparently revolutionary papers modify only one of these layers while retaining the others. For example, DiT retains Transformer computation but replaces autoregressive language modeling with diffusion; π₀ retains a pretrained vision-language foundation but replaces discrete action-token generation with a continuous flow-matching action model; V-JEPA retains a ViT-style encoder while replacing pixel reconstruction with latent prediction. citeturn19search3turn15search8turn14search13

That distinction is important for your atlas because it lets you build **genealogies of ideas rather than genealogies of model names**.

## Attention evolves from alignment mechanism into the computational center of the model

### The first story is about memory access

The important conceptual origin is Bahdanau, Cho and Bengio's 2014 neural machine translation work. Encoder-decoder RNNs had compressed an entire source sentence into a fixed-size representation. Bahdanau attention instead allowed the decoder to assign differentiable weights to encoder states and retrieve different source information for each generated output. Attention was initially therefore a solution to an **information bottleneck between an encoder and decoder**. citeturn0search0

The decisive transition in *Attention Is All You Need* was not simply “better attention.” Vaswani et al. removed recurrence as the mechanism that carries information through a sequence. Self-attention allowed every position to directly compute content-dependent interactions with every other position, while positional representations supplied order. This created a computational graph with far more parallelism than sequential recurrent networks and made attention itself the principal sequence-processing primitive. citeturn0search1

This is the first major narrative for the atlas:

**RNN hidden state → external differentiable lookup → self-attention as global communication fabric.**

That transformation explains much of what came afterward.

### Once recurrence disappeared, position and memory had to be reinvented

Pure self-attention has no intrinsic notion of sequence order, and fixed-length processing does not automatically provide persistent state across segments. Transformer-XL responded by introducing segment-level recurrence and a relative positional formulation, allowing information from earlier segments to be reused rather than recomputed entirely within a fixed window. citeturn1search0

RoFormer then introduced Rotary Position Embedding, or RoPE. Instead of simply adding positional vectors to token representations, RoPE rotates query and key vectors as a function of position, making relative displacement naturally appear in their interaction. RoPE became particularly influential in decoder-only LLM architectures because it integrates positional information directly into attention geometry. citeturn1search1

The historical arc here is subtle:

> Removing recurrence made parallel training extraordinarily attractive, but long-context models gradually reintroduced forms of **state, relative geometry, recurrence, and memory** through other mechanisms.

This tension eventually leads directly to Transformer-XL, recurrent alternatives such as RetNet, state-space models such as Mamba, recurrent/attention hybrids such as Griffin and Jamba, and newer memory architectures such as Titans. citeturn1search0turn10search3turn10search0turn11search1turn11search2turn11search3

### Attention then became a hardware problem

The elementary attention equation makes the \(n\times n\) interaction matrix look like the obvious bottleneck, but on GPUs an equally important question is **where intermediate tensors live and how frequently they move between high-bandwidth memory and on-chip memory**.

FlashAttention was pivotal because it did not approximate attention. It reorganized exact attention as an IO-aware tiled algorithm, reducing transfers between GPU HBM and fast SRAM and avoiding materialization of the entire attention matrix. FlashAttention-2 improved parallel decomposition and GPU utilization; FlashAttention-3 explicitly targeted Hopper-era features such as asynchronous execution and FP8; the continuing FlashAttention line illustrates increasingly explicit algorithm–microarchitecture co-design. citeturn2search0turn2search1turn2search2turn2search15

This produces a second attention genealogy:

**mathematical attention → memory-efficient attention algorithm → accelerator-specific attention kernel.**

That is a fundamental shift. By this stage a paper can leave the model's mathematical function essentially unchanged yet materially alter the feasible context length and training throughput.

### Autoregressive inference created a different bottleneck: KV state

During generation, queries for a new token are computed once, but keys and values for previous tokens are repeatedly needed. Caching them avoids recomputation but creates a memory footprint that grows with sequence length, layer count, batch size, and number of KV heads.

Multi-Query Attention attacked this systems problem by sharing one set of keys and values across query heads, substantially reducing KV-cache traffic. Grouped-Query Attention generalized the idea by using several KV groups rather than either one shared set or one set per query head, producing a compromise between conventional multi-head attention and MQA. citeturn1search2turn1search3

DeepSeek-V2's Multi-head Latent Attention pushes the same idea farther: compress the key/value representation into a lower-dimensional latent form rather than storing a conventional full KV cache, making inference memory part of the model architecture itself. DeepSeek-V2 combines this with sparse MoE computation, illustrating how capacity scaling and memory reduction are increasingly designed together. citeturn9search3

PagedAttention, introduced with vLLM, addressed another layer of the same problem. Rather than changing attention mathematically, it organizes KV-cache memory using a paging scheme analogous to virtual memory, sharply reducing fragmentation and allowing more concurrent sequences to occupy accelerator memory. The original vLLM work reported throughput improvements of roughly two to four times over then-existing serving systems under comparable latency conditions. citeturn2search3

This gives a particularly useful atlas storyline:

> **Attention research split into three different sciences:**  
> mathematical attention mechanisms; model-level memory architecture; and runtime memory management.

Treating all three as merely “attention variants” obscures why they matter.

### The Transformer itself is becoming less architecturally pure

Long-sequence research now challenges the assumption that every token needs unrestricted quadratic content-addressable communication.

Hyena replaces attention with long implicit convolutions and gating. RetNet develops a retention operator that supports parallel computation during training but recurrent execution with constant-size recurrent state during decoding. Mamba's selective state-space model makes state transitions input-dependent and pairs the formulation with a hardware-aware parallel scan, obtaining linear scaling with sequence length without conventional attention. citeturn10search2turn10search3turn10search0

Mamba-2 is especially conceptually important because the authors' State Space Duality establishes a relationship between structured state-space models and attention-like matrix transformations; its redesigned core was reported to be substantially faster than the original Mamba implementation. citeturn10search1

Meanwhile, Jamba deliberately interleaves Transformer and Mamba layers and adds MoE capacity, while Griffin combines gated linear recurrence with local attention. These designs suggest that the most plausible successor to the classic Transformer may not be an entirely different family but rather **architectures that allocate global attention only where global content-addressability is worth its memory cost**. citeturn11search1turn11search2

As of 2026, that interpretation is strengthened rather than weakened by newer research. Mamba-3 explicitly starts from an inference-oriented view of state-space design, while Titans adds a learned neural long-term memory around attention. In other words, the frontier is increasingly about designing different memory regimes rather than asking whether “attention wins.” citeturn11search0turn11search3

## Large language models evolve from scale to selective computation and inference-time thinking

### Scaling laws changed model design into resource allocation

GPT-3 demonstrated that a sufficiently large autoregressive Transformer could perform many tasks from natural-language context without task-specific gradient updates, making in-context learning a central property of the large-language-model paradigm. citeturn0search2

Kaplan et al. then quantified approximate power-law relationships among language-model loss, parameter count, dataset size and training compute. This reframed architecture decisions around a resource-allocation problem: for a fixed compute budget, how should one trade model size against data and optimization? citeturn18search7

Chinchilla materially revised the practical answer. Hoffmann et al. trained hundreds of models and concluded that many very large models of that period were undertrained; under their fitted compute-optimal regime, parameter count and training-token count should increase together. Their 70B-parameter Chinchilla, trained on substantially more data, outperformed substantially larger models trained with similar compute. citeturn18search10

The narrative is therefore not simply:

**more parameters → better model.**

It is:

**scale → empirical scaling laws → compute-optimal allocation among parameters, data and training.**

That distinction also helps explain why later model families could become smaller in active parameter count while consuming vastly more training data.

### Mixture of Experts changes what “model size” means

Sparse Mixture-of-Experts work by Shazeer and colleagues introduced conditional computation in which only selected feed-forward experts are activated for each input, allowing parameter capacity to grow far faster than per-token arithmetic. citeturn9search0

Switch Transformer simplified routing to a single selected expert per token and addressed training instability and communication complexity, demonstrating Transformer models with parameter counts up to the trillion scale while keeping sparse per-token execution. citeturn20search2

Mixtral later made sparse MoE a prominent open-model design: its 8×7B configuration has about 47B total parameters but uses two experts per token, so only a fraction of total parameters participates in each token's computation. citeturn9search2

DeepSeek-V2 and V3 push the same direction much farther. V2 combined DeepSeekMoE with its KV-efficient Multi-head Latent Attention architecture. V3 uses 671B total parameters with 37B activated per token and adds changes including auxiliary-loss-free load balancing and a multi-token-prediction training objective. citeturn9search3turn9search15

For an atlas, **total parameters and active parameters must therefore be separate fields**. Otherwise modern sparse architectures are impossible to compare meaningfully.

A second useful field is **communication pattern**. MoE saves arithmetic relative to an equivalently sized dense model but creates a routing and all-to-all communication problem when experts are distributed across accelerators. Switch explicitly treats communication and instability as core design constraints, and contemporary accelerator platforms increasingly advertise specialized support for large MoE workloads. citeturn20search2turn17search12

### The latest scaling axis is time spent thinking

A further historical turn happened when researchers began treating **inference computation itself as a scalable resource**.

Snell et al. examined ways to allocate additional computation per problem—through strategies including search and verifier-guided selection—and found regimes in which intelligently allocated test-time compute could outperform simply using a substantially larger model at matched computation. citeturn18search0

DeepSeek-R1 then provided an influential demonstration that reinforcement learning with verifiable rewards can strongly shape long-form reasoning behavior. DeepSeek-R1-Zero was trained with large-scale RL without an initial supervised reasoning stage; the subsequent R1 recipe added cold-start data and multi-stage training to improve usability while preserving the reasoning gains. citeturn18search1turn20search12

This introduces a new scaling equation:

\[
\text{capability} \neq f(\text{pretraining FLOPs}) \quad\text{only}
\]

but increasingly

\[
\text{capability} =
f(\text{pretraining},
\text{post-training},
\text{inference compute},
\text{tools/search/memory}).
\]

That equation is a synthesis of the cited research rather than a formula proposed verbatim by one paper, but it captures the architectural consequence: a model may be economically preferable because it can **dynamically spend computation on difficult inputs** instead of paying maximum computation on every input. citeturn18search0turn18search1

This has a direct hardware implication. Long reasoning traces increase generated-token count and KV-state lifetime, making inference efficiency more rather than less important. Thus reasoning research and MQA/GQA/MLA, quantization, PagedAttention and speculative decoding are not separate stories; they are increasingly coupled. citeturn1search2turn1search3turn9search3turn2search3turn18search2

### Autoregression itself is becoming an engineering target

Autoregressive decoding has an unavoidable sequential dependency: token \(t+1\) normally cannot be sampled before token \(t\). On modern accelerators this may underutilize massive parallel compute because each generation step performs relatively little parallel work compared with training.

Speculative decoding uses a cheaper draft model to propose several future tokens and verifies those candidates with the target model while preserving the target sampling distribution. The original Transformer speculative-decoding work demonstrated roughly two- to three-fold acceleration in its experiments. citeturn18search2

Medusa internalizes a related idea by adding additional prediction heads capable of proposing multiple future tokens and verifying candidate continuations in parallel. Its authors explicitly characterize the normal decoding bottleneck in terms of repeatedly transferring model parameters from HBM into faster accelerator storage. citeturn18search3

The research question consequently changes from:

> “How fast is a model forward pass?”

to:

> **“How many useful output tokens do we obtain per expensive traversal of model state?”**

That is likely to be one of the important systems-level narratives of the next generation of language-model architecture.

## Vision evolves from patch tokens to foundation perception and multimodal semantics

Vision is not one Transformer storyline; it contains several clean genealogies that should be represented separately in your atlas.

### Classification: abolish the CNN, then put useful biases back in

Vision Transformer showed that an image can be divided into patches, embedded as a sequence, and processed largely by the same Transformer machinery used for text. Its strongest results depended heavily on large-scale pretraining, demonstrating that some image-specific CNN inductive biases could be traded for scale and data. citeturn5search0

DeiT immediately attacked the resulting data-efficiency problem. It showed that carefully designed augmentation, regularization and distillation could make ViTs highly competitive using ImageNet-scale rather than enormous proprietary pretraining corpora; its distillation token is particularly interesting as an architectural mechanism for transferring CNN teacher information into a Transformer. citeturn5search1

Swin Transformer then restored several properties reminiscent of classical vision pyramids: locality, hierarchy and multiple spatial resolutions. Attention is performed within windows, while shifted windows allow communication across window boundaries. That architecture has linear rather than global-quadratic attention complexity in image size and can act as a general backbone for classification, detection and segmentation. citeturn5search2

So the classification story is beautifully dialectical:

**CNN inductive bias → pure global Transformer → data-efficiency corrections → hierarchical/local Transformer.**

The field did not simply discover that “inductive biases are unnecessary.” It learned **which biases can be removed when data is abundant and which are economically useful to reintroduce**.

### Object detection: from hand-designed pipelines to set prediction

DETR made a more radical contribution than simply attaching a Transformer to a detector. It formulated object detection as direct set prediction, using learned object queries and bipartite matching between predictions and ground-truth objects. This removes several components characteristic of earlier detection pipelines, including anchor engineering and non-maximum suppression. citeturn5search3

Original DETR, however, converged slowly and struggled comparatively with small objects. Deformable DETR replaced dense attention over all spatial positions with attention to a small set of learned sampling points around reference locations, accelerating convergence and improving treatment of multi-scale features and small objects. citeturn6search0

DINO then refined the DETR family with improved query initialization, denoising training and other mechanisms that made end-to-end Transformer detection substantially stronger and easier to optimize. citeturn7search0

This genealogy should stand alone:

**DETR → Deformable DETR → DINO**

because its conceptual thread is not “better vision backbone.” It is **removing manually engineered detection structure and learning the assignment/query mechanism end-to-end**.

### Segmentation: pixels become masks, masks become prompts

MaskFormer reframed semantic segmentation from per-pixel classification into **mask classification**: the model predicts a set of masks and a class for each mask. This made one formulation applicable across semantic and panoptic segmentation. citeturn6search6

Mask2Former generalized the approach across semantic, instance and panoptic segmentation and introduced masked attention in which cross-attention operates only over regions associated with predicted masks. citeturn6search3

Segment Anything then changed the problem definition again. Instead of training a model for a predetermined segmentation taxonomy, SAM was designed as a **promptable segmentation model** and was developed together with SA-1B, containing over one billion masks from roughly eleven million images. citeturn7search1

The segmentation narrative is therefore:

**dense pixel labels → mask-set prediction → universal mask prediction → prompt-conditioned foundation segmentation.**

This is a general pattern worth watching in other domains: a mature supervised task often evolves into **a foundation interface capable of expressing many tasks through prompts**.

### Self-supervised vision moves from augmentation to reconstruction to latent prediction

Another, almost independent, lineage concerns what a visual model should learn before labels are supplied.

DINO demonstrated that self-distillation without labels produces highly structured ViT representations; notably, semantic object/segmentation information emerged in the attention structure despite no segmentation supervision. citeturn7academia30

Masked Autoencoders took a different approach: mask a very large fraction of image patches, encode only the visible patches, and reconstruct missing pixels with a lightweight decoder. MAE found that masking about 75% of patches both provides a challenging learning problem and substantially reduces encoder computation during pretraining. citeturn19search6

VideoMAE exploited even greater redundancy in video and used masking ratios of roughly 90–95%, adapting masked autoencoding to spatiotemporal representation learning. citeturn19search8

I-JEPA changed the target again. Rather than reconstructing missing pixels, it predicts the **latent representation** of missing image regions from visible context. The premise is that forcing prediction in representation space can prioritize higher-level semantic structure instead of spending capacity reproducing unpredictable pixel detail. citeturn14search1

V-JEPA extended feature prediction to video without text, pretrained image features, reconstruction or contrastive negatives. V-JEPA 2 subsequently scaled this approach to over a million hours of video/image data and, after action-conditioned post-training on a comparatively small robot-video corpus, demonstrated planning for real robot manipulation using latent predicted states. citeturn14search13turn14search2

This is one of the most important stories to include in your atlas:

**contrastive/self-distillation representation learning → masked pixel reconstruction → latent predictive modeling → predictive world representation.**

It connects conventional computer vision directly to world models and robotics.

### Multimodal vision shifts semantics from labels to language

CLIP created a particularly influential bridge by training image and text encoders contrastively on hundreds of millions of image-text pairs. Instead of requiring a fixed supervised class vocabulary, natural-language text became the interface to the visual representation, enabling zero-shot transfer through text prompts. citeturn8search0

Flamingo developed the few-shot multimodal direction by connecting pretrained vision and language components and allowing language generation conditioned on interleaved images and text. citeturn8search1

BLIP-2 emphasized efficiency: a lightweight Querying Transformer, or Q-Former, bridges a frozen visual encoder and frozen LLM rather than jointly retraining both giant components. citeturn8search2

LLaVA showed another route: connect a visual encoder to an LLM and perform visual instruction tuning so that multimodal perception can participate in the conversational/instruction-following interface that had already become dominant in language models. citeturn8search3

The important narrative is:

**closed-set visual classification → shared vision-language embedding → multimodal generation → multimodal instruction following.**

Language increasingly becomes the **universal semantic namespace** for perception.

### Anomaly detection is a useful counterexample to a neat Transformer genealogy

Visual anomaly detection does not have a clean sequence analogous to DETR. Its more interesting recent story is the migration from **task-specific anomaly detectors toward repurposing foundation representations**.

WinCLIP adapted CLIP for zero- and few-shot industrial anomaly classification and localization by combining textual state descriptions with window-, patch- and image-level visual features. citeturn19search0

AnomalyCLIP subsequently learned object-agnostic prompts representing generic normality and abnormality, seeking to make the learned concept transferable across objects and even across domains such as industrial inspection and medical imaging. citeturn19search1

That suggests the useful anomaly-detection storyline is not “CNN → ViT.” It is:

**one detector per object/domain → pretrained semantic representation → prompt-based normal/abnormal concepts transferable across domains.**

This distinction will make your atlas much more intellectually useful than organizing everything simply by backbone.

### Image and video generation create another Transformer family

The Transformer also entered vision through a route quite different from ViT classification.

Diffusion Transformers, or DiTs, replace the U-Net traditionally used as the denoising network inside latent diffusion with a Transformer operating over latent image patches. Peebles and Xie found that increasing DiT computational scale through depth, width or token count consistently improved generative quality in their experiments. citeturn19search3

Flow Matching provides a related but broader continuous generative framework: rather than learning a discrete autoregressive distribution, a network learns a vector field transporting samples from a simple distribution toward the data distribution. The framework includes diffusion-like probability paths but permits other choices such as optimal-transport paths. citeturn19search5

This matters far beyond image generation because continuous control is also naturally expressed through trajectories. Physical Intelligence's π₀ therefore uses a **flow-matching action model on top of a pretrained vision-language foundation** for robot control. citeturn15search8

That gives another striking cross-domain genealogy:

**diffusion image generation → Transformer diffusion backbone → flow matching → continuous robot-action generation.**

It is one of the clearest examples of an idea migrating between fields.

Speech provides a parallel lesson. Conformer deliberately combines self-attention's global interactions with convolution's local inductive bias, rather than insisting on a pure Transformer. Its success is an early example of the hybrid architecture pattern that later reappears in sequence models such as Griffin and Jamba. citeturn19search2turn11search1turn11search2

## Hardware is no longer infrastructure beneath the architecture; it helps determine the architecture

This part deserves to be a first-class storyline rather than an appendix.

### There are three different resource constraints

For large models it is useful to separate:

\[
\textbf{arithmetic capacity},\qquad
\textbf{memory capacity/bandwidth},\qquad
\textbf{inter-device communication}.
\]

Different phases stress different resources.

Large matrix multiplications in training can exploit huge accelerator arithmetic throughput. Autoregressive decoding, in contrast, can repeatedly move large weights and KV state while performing comparatively small amounts of useful computation per generated token; Medusa explicitly motivates decoding acceleration in terms of repeated HBM-to-cache movement of model parameters. citeturn18search3

Model training beyond one accelerator introduces yet another bottleneck: tensors must move among accelerators, and collective communication can dominate if model partitioning is badly chosen. Megatron-LM, GPipe, ZeRO and later combinations of multiple parallelism dimensions are all responses to this constraint. citeturn3academia29turn3search1turn4search0turn4search1

### Large-model training develops its own distributed architecture

**Tensor parallelism.** Megatron-LM partitioned large matrix operations within Transformer layers across GPUs, allowing individual layers to exceed one device's practical compute/memory envelope. citeturn3academia29

**Pipeline parallelism.** GPipe partitions layers into stages across accelerators and divides minibatches into microbatches so different pipeline stages can operate concurrently. citeturn3search1

**State sharding.** ZeRO observed that conventional data parallelism redundantly stores optimizer states, gradients and parameters on every worker. Progressively partitioning those states removes enormous memory redundancy. citeturn4search0

**Composed parallelism.** Large-scale Megatron work subsequently combined data, tensor and pipeline parallelism, demonstrating the importance of treating the cluster topology and neural network as one partitioning problem. citeturn4search1

**Automatic partitioning.** Alpa attempts to generate parallelization strategies automatically, distinguishing intra-operator and inter-operator parallelism rather than forcing developers to hand-design every partition. citeturn3search2

**Activation recomputation.** Checkpointing/recomputation trades extra arithmetic for smaller activation memory, another example of computation being deliberately spent to reduce memory pressure. citeturn4search2

The resulting evolution can be summarized as:

**one GPU → replicated model → intra-layer sharding → pipeline stages → optimizer/state sharding → multidimensional parallelism → topology-aware automated planning.**

That should be one of your core atlas narratives.

### Accelerator generations explain why precision keeps falling

FP8 work demonstrated that carefully designed 8-bit floating-point formats could train large neural networks, including models up to 175B parameters in the experiments, with quality comparable to 16-bit training. The proposed E4M3 and E5M2 formats trade precision against dynamic range differently. citeturn16search0

This coincided with hardware explicitly designed to exploit those formats. NVIDIA's Hopper architecture added a Transformer Engine and FP8 Tensor Core execution; NVIDIA states that FP8 halves the data footprint relative to FP16/BF16 while increasing Tensor Core throughput for supported operations. citeturn17search4turn17search14

Blackwell extends the trend with lower-precision Transformer execution including FP4-oriented capabilities. NVIDIA's current Blackwell documentation specifically describes its second-generation Transformer Engine as targeting LLM and MoE training/inference. citeturn17search12

The memory side progressed simultaneously. NVIDIA lists about 3 TB/s of memory bandwidth for H100 and 4.8 TB/s with 141 GB HBM3e for H200; B200-class systems substantially increase aggregate memory capacity and bandwidth again. citeturn17search1turn17search7turn17search0

The direction is even clearer at rack scale. NVIDIA's GB200 NVL72 integrates 72 Blackwell GPUs into one NVLink domain and lists 130 TB/s of aggregate low-latency GPU communication within the rack. citeturn17search6

Google's TPU work illustrates the same co-design principle from another vendor. TPU v4 is a machine-learning-specific accelerator and supercomputer architecture whose design includes optically reconfigurable interconnect topology and dedicated SparseCores for embedding-heavy workloads; the TPU v4 paper explicitly describes the architecture as having evolved in response to rapidly changing ML workloads. citeturn17academia38

The crucial interpretation is therefore not “GPUs keep getting faster.” It is:

> **The hardware is becoming structurally aware of the characteristic operations of foundation models—matrix multiplication, reduced precision, embeddings, sparse experts, large memory footprints and collective communication.**

At the same time, model researchers increasingly design architectures that expose exactly those operations efficiently. citeturn17academia38turn17search12

### Quantization moves from compression after training toward architecture before training

Post-training methods first asked how aggressively an already-trained high-precision model could be compressed.

GPTQ demonstrated accurate one-shot weight quantization down to roughly 3–4 bits for very large GPT-class models. citeturn16search8

SmoothQuant addressed the difficulty of activation outliers by mathematically moving part of the quantization difficulty from activations into weights, enabling W8A8 execution across LLM matrix multiplications. citeturn16search1

AWQ focuses on low-bit weight-only inference and uses activation statistics to identify particularly important weight channels, preserving them through an equivalent scaling transformation while remaining hardware-friendly. citeturn16search2

BitNet changes the philosophy. Rather than train a high-precision Transformer and quantize afterward, its linear layers are designed for low-bit weights during training. The later b1.58 formulation uses ternary weights; subsequent empirical work reports competitive performance relative to comparable half-precision Transformer baselines while substantially reducing inference memory and computation. citeturn16search9turn16search6

So another clear research progression is:

**full precision → mixed precision → post-training low-bit compression → quantization-aware training → native low-bit architecture.**

This may ultimately create a stronger hardware feedback loop: if architectures can reliably operate with ternary or extremely low-precision weights, future accelerators need not be designed around exactly the same arithmetic primitives as today's GPUs. BitNet's authors explicitly point toward specialized hardware as a consequence. citeturn16search6

### The architecture is increasingly the memory hierarchy

Several threads now converge:

- FlashAttention modifies data movement inside an accelerator. citeturn2search0
- MQA/GQA/MLA modify how much persistent attention state must be stored. citeturn1search2turn1search3turn9search3
- PagedAttention modifies how that state is allocated at serving time. citeturn2search3
- Quantization reduces how much weight and activation data has to move. citeturn16search1turn16search2
- MoE reduces how many parameters must participate in each token's arithmetic, while increasing routing/communication complexity. citeturn20search2turn9search2
- Speculative decoding and Medusa try to extract multiple output tokens from fewer expensive model traversals. citeturn18search2turn18search3

Seen together, these are not miscellaneous optimizations. They constitute a coherent research program:

> **make every expensive movement of parameters, activations, KV state, or inter-GPU data produce more useful computation.**

That is arguably the most important engineering narrative surrounding modern foundation models.

## World models and robotics are splitting into several competing notions of physical intelligence

The term **world model** currently hides several quite different technical ideas. Separating them is essential.

### The classical world-model lineage learns dynamics so an agent can imagine

Ha and Schmidhuber's *World Models* used a learned compressed representation plus a learned temporal model of an environment and showed that a controller could be trained inside simulated trajectories generated by that learned model. citeturn15search2

PlaNet made latent dynamics central to model-based reinforcement learning from pixels, learning deterministic and stochastic latent state dynamics and planning directly in latent space instead of reconstructing the entire environment for decision making. citeturn12search1

Dreamer then replaced repeated online planning with learning behaviors through trajectories imagined inside a latent world model, propagating learning signals through the imagined dynamics. citeturn12search2

DreamerV2 moved to discrete latent representations and demonstrated strong Atari performance; DreamerV3 emphasized a general training recipe working across more than 150 tasks with a fixed configuration. citeturn12search3turn12search17

Dreamer 4, introduced in 2025, makes the connection to modern foundation architectures explicit. It trains an agent through reinforcement learning inside a scalable video world model, employs an efficient Transformer-based design, learns much of its environmental knowledge from unlabeled video, and demonstrates long-horizon offline Minecraft control through imagined experience. citeturn15academia10

The lineage is:

**compact learned simulator → latent planning → latent imagination → general RL world model → scalable video world model.**

This is the clearest continuation of the classical model-based-RL meaning of “world model.”

### JEPA represents a different philosophy: predict what matters, not every pixel

The JEPA lineage asks whether a model really needs to predict the detailed sensory future.

I-JEPA predicts representations of hidden image regions from visible context rather than reconstructing pixels. citeturn14search1

V-JEPA applies feature prediction to video, learning temporal visual representations without pixel reconstruction, text supervision or contrastive negative samples. citeturn14search13

V-JEPA 2 pushes this idea directly toward physical intelligence. It pretrains on more than one million hours of video/image data and then converts the learned representation into an action-conditioned predictive model using less than 62 hours of robot-video data in the reported experiments. The resulting system performs image-goal planning for robot arms without collecting task-specific training data from the deployment environments. citeturn14search2

That gives a different world-model genealogy:

**self-supervised representation → masked latent prediction → video latent prediction → action-conditioned latent prediction → planning.**

This is conceptually distinct from a high-fidelity generative video simulator. JEPA's bet is that **an intelligent agent should predict abstract state sufficient for decisions rather than all unpredictable sensory detail**.

That is one of the most important architectural debates to follow over the next several years.

### Generative world models take the opposite route: simulate perceptual reality

Genie introduced an 11B-parameter generative interactive environment model trained from unlabeled Internet video. Its architecture includes a spatiotemporal video tokenizer, autoregressive dynamics and a learned latent-action model, allowing generated environments to become controllable despite the underlying videos lacking ground-truth action labels. citeturn15search0

NVIDIA's Cosmos program represents a more industrial “world foundation model” interpretation: large pretrained world-generation models are adapted to specific physical-AI domains and used for synthetic data generation, simulation and downstream system development. citeturn15search1

The later Cosmos-Predict2.5 family uses a flow-based video architecture to unify text-to-world, image-to-world and video-to-world generation; NVIDIA reports training on 200 million curated video clips and positions the resulting models for synthetic data, policy evaluation and closed-loop physical simulation. citeturn15search3

Cosmos-Drive-Dreams illustrates the downstream motivation particularly clearly: generate rare and difficult driving scenarios that are expensive to capture in the real world and use them for perception and driving-policy training. citeturn15search4

The generative-world-model narrative is:

**video generation → controllable video generation → interactive environment → domain-adapted world foundation model → synthetic experience for agents.**

The unresolved question is whether **visual realism is sufficiently correlated with correct causal physics** for these models to serve as reliable environments for policy learning. The recent literature demonstrates increasingly sophisticated simulation, but this remains a research question rather than a solved consequence of photorealistic generation. That caution is an inference from the divergent objectives of generative world models and latent predictive/planning models. citeturn15search0turn14search2turn15search3

### Robotics develops a separate Vision-Language-Action genealogy

RT-1 showed that a Transformer could be trained as a real-world multi-task robotic controller from a large demonstration dataset, representing perception, language conditioning and actions in one scalable policy architecture. citeturn13search0

RT-2 then connected robotic control to Internet-scale vision-language learning. Instead of treating web-trained semantic knowledge and robot control as separate modules, the model represents robot actions within the output vocabulary of a vision-language model so that knowledge learned from web data can influence end-to-end action generation. citeturn13search4

π₀ changes the output side substantially. Rather than treating continuous high-frequency robot control primarily as autoregressive discrete action tokens, it adds a flow-matching action model on top of a pretrained VLM and trains across multiple robot embodiments. citeturn15search8

π₀.₅ then emphasizes open-world generalization by co-training heterogeneous signals including robot data, web data, language, semantic subtasks and low-level actions; its reported experiments include long-horizon manipulation in previously unseen homes. citeturn13search9

Gemini Robotics represents another branch in which a large multimodal foundation is explicitly converted into a generalist Vision-Language-Action model for physical control; the subsequent Gemini Robotics 1.5 work emphasizes both multi-embodiment action and an embodied-reasoning model. citeturn13search6turn13search2

Thus the useful VLA storyline is:

**task-specific robot policy → general multi-task Transformer policy → web-pretrained VLM becomes policy → continuous generative action head → embodied reasoning plus generalist control.**

This also demonstrates why “robot models will require fundamentally non-Transformer architectures” is, at least so far, too strong. Much frontier robotics remains Transformer- or VLM-based. The more radical differences are often found in **the prediction target and action-generation mechanism**: latent-world prediction, diffusion/flow action trajectories, hierarchical reasoning, or learned simulation. citeturn13search4turn15search8turn14search2

### The most interesting future competition is therefore between four designs

A useful conceptual taxonomy for tracking embodied AI after 2026 is:

| Paradigm | Model predicts | Typical use | Representative lineage |
|---|---|---|---|
| **VLA policy** | Action directly from vision/language/context | End-to-end control | RT-1 → RT-2 → π₀/π₀.₅ → Gemini Robotics. citeturn13search0turn13search4turn15search8turn13search9turn13search6 |
| **Latent world model** | Future abstract state | Planning and representation | PlaNet/Dreamer → I-JEPA/V-JEPA → V-JEPA 2. citeturn12search1turn12search2turn14search1turn14search2 |
| **Generative simulator** | Future perceptual observations | Synthetic experience, evaluation, planning | Genie → Cosmos → Cosmos-Predict2.5. citeturn15search0turn15search1turn15search3 |
| **Hybrid agent** | Reasoning/plans plus actions and/or imagined consequences | Long-horizon autonomous behavior | Dreamer 4, Gemini Robotics family, emerging world-model/VLA combinations. citeturn15academia10turn13search2 |

My strongest research hypothesis from this literature is that **the eventual general-purpose embodied architecture is likely to combine these roles rather than select exactly one of them**: a semantic multimodal model for instructions and abstract reasoning; a predictive latent model for fast consequence estimation; a policy/action model for precise continuous control; and perhaps a generative simulator for data augmentation and slow deliberation. This is an inference, but it follows directly from the complementary capabilities demonstrated by current VLA, JEPA, Dreamer and generative-world-model lines. citeturn14search2turn15search8turn15academia10turn15search3

## A publication atlas and the narratives I would preserve

For the atlas you described, I would avoid storing papers in a single chronological list. Each publication should have multiple tags—for example **mechanism**, **training objective**, **modality**, **task**, **hardware implication**, **predecessor**, and **descendants**—because many of the most important papers are bridges between storylines.

The following is a practical first-pass canonical set.

| Atlas thread | Core publication sequence | The narrative it tells |
|---|---|---|
| **Attention and sequence memory** | Bahdanau et al., *Neural Machine Translation by Jointly Learning to Align and Translate* (2014) citeturn0search0 → Vaswani et al., *Attention Is All You Need* (2017) citeturn0search1 → *Transformer-XL* (2019) citeturn1search0 → *RoFormer/RoPE* (2021) citeturn1search1 | Attention begins as adaptive retrieval, replaces recurrence, then needs new positional and persistent-memory mechanisms. |
| **Attention optimized for decoding** | *Multi-Query Attention* (2019) citeturn1search2 → *Grouped-Query Attention* (2023) citeturn1search3 → DeepSeek-V2/MLA (2024) citeturn9search3 | KV memory becomes an explicit architectural optimization target. |
| **Attention optimized for hardware** | *FlashAttention* (2022) citeturn2search0 → *FlashAttention-2* (2023) citeturn2search1 → *FlashAttention-3* (2024) citeturn2search2 → FlashAttention-4 (2026) citeturn2search15 | Exact mathematical attention is reorganized around GPU memory hierarchy and successive accelerator generations. |
| **LLM scaling** | GPT-3 (2020) citeturn0search2 → Kaplan et al., *Scaling Laws* (2020) citeturn18search7 → Chinchilla (2022) citeturn18search10 | Scaling changes from an empirical observation into compute-allocation science. |
| **Sparse capacity** | Shazeer et al., sparse MoE (2017) citeturn9search0 → Switch Transformer (2021) citeturn20search2 → Mixtral (2024) citeturn9search2 → DeepSeek-V2/V3 (2024–25) citeturn9search3turn9search15 | Parameter count is decoupled from per-token compute; routing and networking become architectural concerns. |
| **Reasoning and test-time scaling** | *Scaling LLM Test-Time Compute Optimally* (2024) citeturn18search0 → DeepSeek-R1 (2025) citeturn18search1 | Capability begins to scale through dynamically allocated inference computation and RL-trained reasoning. |
| **Non-attention sequence models** | Hyena (2023) citeturn10search2 → RetNet (2023) citeturn10search3 → Mamba (2023) citeturn10search0 → Mamba-2 (2024) citeturn10search1 → Mamba-3 (2026) citeturn11search0 | Long-range modeling is reconsidered through convolution, recurrence and selective state-space dynamics. |
| **Hybrid sequence models** | Jamba (2024) citeturn11search1 → Griffin (2024) citeturn11search2 → Titans (2024–25) citeturn11search3 | Instead of replacing attention wholesale, architectures assign different memory mechanisms to different functions. |
| **Vision backbone** | ViT (2020) citeturn5search0 → DeiT (2020) citeturn5search1 → Swin (2021) citeturn5search2 | Vision moves from CNNs to pure token models, then selectively restores locality and hierarchy. |
| **Object detection** | DETR (2020) citeturn5search3 → Deformable DETR (2020) citeturn6search0 → DINO (2022) citeturn7search0 | Detection becomes learned set prediction and then becomes computationally and statistically practical. |
| **Segmentation** | MaskFormer (2021) citeturn6search6 → Mask2Former (2021–22) citeturn6search3 → Segment Anything (2023) citeturn7search1 | Segmentation shifts from task-specific pixels toward universal mask prediction and prompts. |
| **Self-supervised vision** | DINO (2021) citeturn7academia30 → MAE (2021) citeturn19search6 → VideoMAE (2022) citeturn19search8 → I-JEPA (2023) citeturn14search1 → V-JEPA (2024) citeturn14search13 → V-JEPA 2 (2025) citeturn14search2 | Learning targets move from self-distilled semantic representations to reconstruction and finally latent world prediction. |
| **Vision-language models** | CLIP (2021) citeturn8search0 → Flamingo (2022) citeturn8search1 → BLIP-2 (2023) citeturn8search2 → LLaVA (2023) citeturn8search3 | Text becomes a universal semantic interface to visual representations and eventually multimodal dialogue. |
| **Foundation-model anomaly detection** | WinCLIP (2023) citeturn19search0 → AnomalyCLIP (2023–24) citeturn19search1 | Industrial anomaly detection moves from per-domain models toward transferable normality/abnormality concepts. |
| **Continuous generative models** | Flow Matching (2022) citeturn19search5 → DiT (2022) citeturn19search3 → π₀ (2024) citeturn15search8 | Continuous generative modeling migrates from images into high-dimensional continuous action trajectories. |
| **Distributed training** | GPipe (2018) citeturn3search1 → Megatron-LM (2019) citeturn3academia29 → ZeRO (2019–20) citeturn4search0 → multidimensional Megatron (2021) citeturn4search1 → Alpa (2022) citeturn3search2 | Large-model training becomes a distributed-computing architecture problem. |
| **Serving and decoding** | speculative decoding (2022–23) citeturn18search2 → PagedAttention/vLLM (2023) citeturn2search3 → Medusa (2024) citeturn18search3 | The unit being optimized changes from model FLOPs to useful generated tokens per memory traversal. |
| **Low precision** | FP8 (2022) citeturn16search0 → GPTQ/SmoothQuant (2022) citeturn16search8turn16search1 → AWQ (2023) citeturn16search2 → BitNet (2023–25) citeturn16search9turn16search6 | Precision reduction evolves from deployment compression into a native architectural assumption. |
| **Classical latent world models** | *World Models* (2018) citeturn15search2 → PlaNet (2018) citeturn12search1 → Dreamer (2019) citeturn12search2 → DreamerV2/V3 citeturn12search3turn12search17 → Dreamer 4 (2025) citeturn15academia10 | Agents increasingly learn and act inside learned latent or video simulations. |
| **Generative world foundation models** | Genie (2024) citeturn15search0 → Cosmos (2025) citeturn15search1 → Cosmos-Predict2.5 (2025–26) citeturn15search3 | Video generators evolve toward controllable, reusable simulators for physical AI. |
| **Vision-language-action robotics** | RT-1 (2022) citeturn13search0 → RT-2 (2023) citeturn13search4 → π₀ (2024) citeturn15search8 → π₀.₅ (2025) citeturn13search9 → Gemini Robotics/Robotics 1.5 (2025) citeturn13search6turn13search2 | Robotics absorbs Internet-scale multimodal representations and explores discrete, continuous and reasoning-mediated action generation. |

For building the atlas itself, I would give every paper a record roughly of this conceptual form:

`Paper → problem → predecessor → key idea → representation → computational primitive → objective → hardware consequence → downstream descendants → competing branch`.

That structure allows the same paper to appear in several narratives. FlashAttention belongs simultaneously to attention, long context and hardware co-design; π₀ belongs to multimodality, flow matching and robotics; V-JEPA 2 belongs to self-supervision, video, world models and planning. citeturn2search0turn15search8turn14search2

The literature above also suggests a **reading order** very different from chronological publication order. For developing an explanatory narrative, I would start with six chains:

**Attention and memory:** Bahdanau → Transformer → Transformer-XL/RoPE → MQA/GQA → FlashAttention/PagedAttention → MLA → Mamba/RetNet/hybrids. citeturn0search0turn0search1turn1search0turn1search1turn1search2turn1search3turn2search0turn2search3turn9search3turn10search0

**Scaling:** GPT-3 → Scaling Laws → Chinchilla → Switch → Mixtral → DeepSeek-V2/V3 → test-time scaling → R1. citeturn0search2turn18search7turn18search10turn20search2turn9search2turn9search3turn9search15turn18search0turn18search1

**Vision:** ViT → DeiT/Swin → DETR and MaskFormer families → DINO/MAE → SAM → CLIP/VLMs → I-JEPA/V-JEPA. citeturn5search0turn5search1turn5search2turn5search3turn6search6turn19search6turn7search1turn8search0turn14search1turn14search13

**Hardware:** Megatron/GPipe → ZeRO → mixed multidimensional parallelism → FlashAttention → MQA/GQA/PagedAttention → FP8/quantization → low-bit native models. citeturn3academia29turn3search1turn4search0turn4search1turn2search0turn1search3turn2search3turn16search0turn16search6

**World models:** World Models → PlaNet → Dreamer → Genie → JEPA/V-JEPA → V-JEPA 2 → Dreamer 4/Cosmos. citeturn15search2turn12search1turn12search2turn15search0turn14search1turn14search13turn14search2turn15academia10turn15search3

**Embodied foundation models:** RT-1 → RT-2 → π₀ → π₀.₅ → Gemini Robotics, read alongside V-JEPA 2 rather than treating world models and VLA policies as separate fields. citeturn13search0turn13search4turn15search8turn13search9turn13search6turn14search2

The highest-level conclusion from this literature is that **the Transformer has not disappeared, but “the Transformer model” is ceasing to be a sufficiently precise unit of analysis**. Modern systems increasingly combine Transformer attention, sparse experts, recurrent or state-space memory, modality-specific encoders, latent prediction, diffusion or flow objectives, quantized arithmetic, external or persistent memory, and sophisticated serving runtimes. The frontier is therefore moving from discovering one universal neural block toward **allocating different kinds of computation, memory and prediction to the parts of the problem where they are economically and statistically appropriate**. citeturn10search1turn11search1turn9search3turn14search2turn15search8turn16search6

For the historical narratives you intend to build, that is the organizing principle I would preserve: **follow the bottleneck**. Each major family above becomes intelligible once you ask what became limiting after the previous breakthrough—information bottlenecks produced attention; sequential computation produced Transformers; quadratic/state costs produced efficient attention and recurrent alternatives; dense compute produced MoE; labeled data produced self-supervision; task-specific vision produced foundation models; real-world data scarcity produced world simulators; and accelerator memory and communication constraints increasingly determine the shape of the models themselves. citeturn0search0turn0search1turn20search2turn19search6turn7search1turn15search1turn2search0turn4search0