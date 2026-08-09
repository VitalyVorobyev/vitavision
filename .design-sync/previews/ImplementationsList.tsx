import { ImplementationsList } from 'vitcv';

export const OfficialAndCommunity = () => (
    <ImplementationsList
        implementations={[
            {
                role: 'official',
                repo: 'https://github.com/magicleap/SuperPointPretrainedNetwork',
                commit: '1fda796addba9b6f8e79d586a3699700a86b1cea',
                framework: 'pytorch',
                license: 'noncommercial-research-only',
                weights_url:
                    'https://github.com/magicleap/SuperPointPretrainedNetwork/blob/master/superpoint_v1.pth',
                weights_license: 'noncommercial-research-only',
            },
            {
                role: 'community',
                repo: 'https://github.com/rpautrat/SuperPoint',
                commit: '3c1a68e94cc4d5c69d0b16b2e02c8dc85a99a49d',
                framework: 'tensorflow',
                license: 'MIT',
            },
        ]}
    />
);

export const WithPort = () => (
    <ImplementationsList
        implementations={[
            {
                role: 'official',
                repo: 'https://github.com/tensorflow/models',
                commit: '451906e4e82f19712455066c1b27e2a6ba71b1dd',
                framework: 'tensorflow',
                license: 'Apache-2.0',
            },
            {
                role: 'community',
                repo: 'https://github.com/pytorch/vision',
                commit: '78839c2b06c83c6cfb5c4da692ffb331bbd4c4cc',
                framework: 'pytorch',
                license: 'BSD-3-Clause',
            },
            {
                role: 'port',
                repo: 'https://github.com/onnx/models',
                commit: 'd132b8a127eba63a1dc55757b8be2d17be359418',
                framework: 'other',
                license: 'Apache-2.0',
                weights_url:
                    'https://github.com/onnx/models/tree/main/validated/vision/classification/mobilenet',
                weights_license: 'Apache-2.0',
            },
        ]}
    />
);

export const SingleOfficialNoWeights = () => (
    <ImplementationsList
        implementations={[
            {
                role: 'official',
                repo: 'https://github.com/cvg/LightGlue',
                commit: 'edb2b83829c052ded8dbfc9db4f7d1ec453ffa07',
                framework: 'pytorch',
                license: 'Apache-2.0',
            },
        ]}
    />
);
