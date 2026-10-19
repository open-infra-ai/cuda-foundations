import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const repoUrl = 'https://github.com/open-infra-ai/cuda-foundations'
const pagesUrl = 'https://open-infra-ai.github.io/cuda-foundations/'
const docsEditPattern = `${repoUrl}/edit/master/docs/:path`

export default withMermaid(defineConfig({
  base: '/cuda-foundations/',
  title: 'cuda-foundations',
  description: 'Systematic CUDA kernel engineering from SGEMM to inference',

  lang: 'zh-CN',

  lastUpdated: true,

  cleanUrls: true,

  sitemap: {
    hostname: pagesUrl
  },

  markdown: {
    lineNumbers: true,
    theme: { light: 'github-light', dark: 'github-dark' }
  },

  head: [
    ['meta', { name: 'description', content: 'Systematic CUDA kernel engineering from SGEMM fundamentals to reusable inference components' }],
    ['meta', { name: 'keywords', content: 'CUDA, kernel, SGEMM, GEMM, Tensor Core, FlashAttention, inference engine, GPU programming' }],
    ['meta', { name: 'author', content: 'holtwood' }],
    ['meta', { name: 'theme-color', content: '#76B900' }],
    ['meta', { property: 'og:title', content: 'cuda-foundations' }],
    ['meta', { property: 'og:description', content: 'Systematic CUDA kernel engineering from SGEMM fundamentals to reusable inference components' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: pagesUrl }],
    ['meta', { property: 'og:site_name', content: 'cuda-foundations' }],
    ['meta', { property: 'og:image', content: `${pagesUrl}og-image.svg` }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'cuda-foundations' }],
    ['meta', { name: 'twitter:description', content: 'Systematic CUDA kernel engineering from SGEMM fundamentals to reusable inference components' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'canonical', href: pagesUrl }],
  ],

  themeConfig: {
    outline: [2, 3],

    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: repoUrl }
    ],

    nav: [
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/zh/guides/getting-started', activeMatch: '/zh/guides/' },
          { text: '工作流', link: '/zh/guides/workflow', activeMatch: '/zh/guides/' },
          { text: '阅读路径', link: '/zh/guides/reading-paths', activeMatch: '/zh/guides/' }
        ]
      },
      {
        text: '模块',
        items: [
          { text: '01-SGEMM', link: '/zh/modules/01-sgemm', activeMatch: '/zh/modules/01' },
          { text: '02-TensorCraft', link: '/zh/modules/02-tensorcraft', activeMatch: '/zh/modules/02' },
          { text: '03-HPC', link: '/zh/modules/03-hpc', activeMatch: '/zh/modules/03' },
          { text: '04-Inference', link: '/zh/modules/04-inference', activeMatch: '/zh/modules/04' }
        ]
      },
      {
        text: '技术白皮书',
        items: [
          { text: '系统架构', link: '/zh/whitepaper/architecture', activeMatch: '/zh/whitepaper/' },
          { text: 'SGEMM 优化', link: '/zh/whitepaper/sgemm-optimization', activeMatch: '/zh/whitepaper/' },
          { text: '推理引擎设计', link: '/zh/whitepaper/inference-engine-design', activeMatch: '/zh/whitepaper/' },
          { text: 'TensorCraft 设计', link: '/zh/whitepaper/tensorcraft-design', activeMatch: '/zh/whitepaper/' },
          { text: '高级技术', link: '/zh/whitepaper/advanced-showcase', activeMatch: '/zh/whitepaper/' }
        ]
      },
      {
        text: '参考',
        items: [
          { text: '编码风格', link: '/zh/reference/coding-style', activeMatch: '/zh/reference/' },
          { text: '故障排查', link: '/zh/reference/troubleshooting', activeMatch: '/zh/reference/' },
          { text: '集成示例', link: '/zh/reference/integration-examples', activeMatch: '/zh/reference/' }
        ]
      },
      { text: 'Benchmarks', link: '/zh/benchmarks/', activeMatch: '/zh/benchmarks/' },
      { text: '路线图', link: '/zh/roadmap' }
    ],

    sidebar: {
      '/zh/whitepaper/': [
        {
          text: '技术白皮书',
          items: [
            { text: '系统架构设计', link: '/zh/whitepaper/architecture' },
            { text: 'SGEMM 优化旅程', link: '/zh/whitepaper/sgemm-optimization' },
            { text: '推理引擎设计', link: '/zh/whitepaper/inference-engine-design' },
            { text: 'TensorCraft 设计', link: '/zh/whitepaper/tensorcraft-design' },
            { text: '高级技术展示', link: '/zh/whitepaper/advanced-showcase' }
          ]
        }
      ],
      '/zh/modules/01-sgemm': [
        {
          text: '01-SGEMM 教程',
          items: [
            { text: '概述', link: '/zh/modules/01-sgemm' },
            { text: 'Naive 实现', link: '/zh/modules/01/sgemm-naive' },
            { text: '分块优化', link: '/zh/modules/01/sgemm-tiled' },
            { text: 'Bank Conflict', link: '/zh/modules/01/sgemm-bank-conflict' },
            { text: '双缓冲', link: '/zh/modules/01/sgemm-double-buffer' },
            { text: 'Tensor Core', link: '/zh/modules/01/sgemm-tensor-core' }
          ]
        }
      ],
      '/zh/modules/02-tensorcraft': [
        {
          text: '02-TensorCraft Core',
          items: [
            { text: '概述', link: '/zh/modules/02-tensorcraft' },
            { text: '架构', link: '/zh/modules/02/architecture' },
            { text: '优化指南', link: '/zh/modules/02/optimization-guide' },
            { text: 'API 参考', link: '/zh/modules/02/api-reference' }
          ]
        }
      ],
      '/zh/modules/03-hpc': [
        {
          text: '03-HPC 进阶',
          items: [
            { text: '概述', link: '/zh/modules/03-hpc' },
            { text: 'GEMM 优化', link: '/zh/modules/03/gemm-optimization' },
            { text: '内存优化', link: '/zh/modules/03/memory-optimization' },
            { text: '归约优化', link: '/zh/modules/03/reduction-optimization' },
            { text: 'Flash Attention', link: '/zh/modules/03/flash-attention' },
            { text: 'CUDA 13 特性', link: '/zh/modules/03/cuda13-features' }
          ]
        }
      ],
      '/zh/modules/04-inference': [
        {
          text: '04-Inference Engine',
          items: [
            { text: '概述', link: '/zh/modules/04-inference' },
            { text: '快速开始', link: '/zh/modules/04/quick-start' },
            { text: '架构', link: '/zh/modules/04/architecture' },
            { text: '性能调优', link: '/zh/modules/04/performance-tuning' }
          ]
        }
      ],
      '/zh/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/zh/guides/getting-started' },
            { text: '工作流', link: '/zh/guides/workflow' },
            { text: '阅读路径', link: '/zh/guides/reading-paths' }
          ]
        },
        {
          text: '参考',
          items: [
            { text: '编码风格', link: '/zh/reference/coding-style' },
            { text: '故障排查', link: '/zh/reference/troubleshooting' },
            { text: '集成示例', link: '/zh/reference/integration-examples' },
            { text: 'Benchmarks', link: '/zh/benchmarks/' },
            { text: '路线图', link: '/zh/roadmap' }
          ]
        }
      ]
    },

    editLink: {
      pattern: docsEditPattern
    },

    lastUpdated: {
      text: '最后更新于'
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    skipToContentLabel: '跳转到内容',
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 cuda-foundations Contributors'
    }
  },

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN'
    },
    en: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          {
            text: 'Guides',
            items: [
              { text: 'Getting Started', link: '/en/guides/getting-started', activeMatch: '/en/guides/' },
              { text: 'Workflow', link: '/en/guides/workflow', activeMatch: '/en/guides/' },
              { text: 'Reading Paths', link: '/en/guides/reading-paths', activeMatch: '/en/guides/' },
              { text: 'Profiling', link: '/en/guides/profiling', activeMatch: '/en/guides/' }
            ]
          },
          {
            text: 'Modules',
            items: [
              { text: '01-SGEMM', link: '/en/modules/01-sgemm', activeMatch: '/en/modules/01' },
              { text: '02-TensorCraft', link: '/en/modules/02-tensorcraft', activeMatch: '/en/modules/02' },
              { text: '03-HPC', link: '/en/modules/03-hpc', activeMatch: '/en/modules/03' },
              { text: '04-Inference', link: '/en/modules/04-inference', activeMatch: '/en/modules/04' }
            ]
          },
          {
            text: 'Whitepaper',
            items: [
              { text: 'Architecture', link: '/en/whitepaper/architecture', activeMatch: '/en/whitepaper/' },
              { text: 'SGEMM Optimization', link: '/en/whitepaper/sgemm-optimization', activeMatch: '/en/whitepaper/' },
              { text: 'Inference Engine', link: '/en/whitepaper/inference-engine-design', activeMatch: '/en/whitepaper/' },
              { text: 'TensorCraft', link: '/en/whitepaper/tensorcraft-design', activeMatch: '/en/whitepaper/' },
              { text: 'Advanced Tech', link: '/en/whitepaper/advanced-showcase', activeMatch: '/en/whitepaper/' }
            ]
          },
          {
            text: 'Reference',
            items: [
              { text: 'Coding Style', link: '/en/reference/coding-style', activeMatch: '/en/reference/' },
              { text: 'Troubleshooting', link: '/en/reference/troubleshooting', activeMatch: '/en/reference/' },
              { text: 'Integration', link: '/en/reference/integration-examples', activeMatch: '/en/reference/' }
            ]
          },
          { text: 'Benchmarks', link: '/en/benchmarks/', activeMatch: '/en/benchmarks/' },
          { text: 'Roadmap', link: '/en/roadmap' }
        ],
        sidebar: {
          '/en/whitepaper/': [
            {
              text: 'Technical Whitepaper',
              items: [
                { text: 'System Architecture', link: '/en/whitepaper/architecture' },
                { text: 'SGEMM Optimization', link: '/en/whitepaper/sgemm-optimization' },
                { text: 'Inference Engine Design', link: '/en/whitepaper/inference-engine-design' },
                { text: 'TensorCraft Design', link: '/en/whitepaper/tensorcraft-design' },
                { text: 'Advanced Tech Showcase', link: '/en/whitepaper/advanced-showcase' }
              ]
            }
          ],
          '/en/modules/01-sgemm': [
            {
              text: '01-SGEMM Tutorial',
              items: [
                { text: 'Overview', link: '/en/modules/01-sgemm' },
                { text: 'Naive', link: '/en/modules/01/sgemm-naive' },
                { text: 'Tiled', link: '/en/modules/01/sgemm-tiled' },
                { text: 'Bank Conflict', link: '/en/modules/01/sgemm-bank-conflict' },
                { text: 'Double Buffer', link: '/en/modules/01/sgemm-double-buffer' },
                { text: 'Tensor Core', link: '/en/modules/01/sgemm-tensor-core' }
              ]
            }
          ],
          '/en/modules/02-tensorcraft': [
            {
              text: '02-TensorCraft Core',
              items: [
                { text: 'Overview', link: '/en/modules/02-tensorcraft' },
                { text: 'Architecture', link: '/en/modules/02/architecture' },
                { text: 'Optimization Guide', link: '/en/modules/02/optimization-guide' },
                { text: 'API Reference', link: '/en/modules/02/api-reference' }
              ]
            }
          ],
          '/en/modules/03-hpc': [
            {
              text: '03-HPC Advanced',
              items: [
                { text: 'Overview', link: '/en/modules/03-hpc' },
                { text: 'GEMM Optimization', link: '/en/modules/03/gemm-optimization' },
                { text: 'Memory Optimization', link: '/en/modules/03/memory-optimization' },
                { text: 'Reduction', link: '/en/modules/03/reduction-optimization' },
                { text: 'Flash Attention', link: '/en/modules/03/flash-attention' },
                { text: 'CUDA 13 Features', link: '/en/modules/03/cuda13-features' }
              ]
            }
          ],
          '/en/modules/04-inference': [
            {
              text: '04-Inference Engine',
              items: [
                { text: 'Overview', link: '/en/modules/04-inference' },
                { text: 'Quick Start', link: '/en/modules/04/quick-start' },
                { text: 'Architecture', link: '/en/modules/04/architecture' },
                { text: 'Performance Tuning', link: '/en/modules/04/performance-tuning' }
              ]
            }
          ],
          '/en/': [
            {
              text: 'Guides',
              items: [
                { text: 'Getting Started', link: '/en/guides/getting-started' },
                { text: 'Workflow', link: '/en/guides/workflow' },
                { text: 'Reading Paths', link: '/en/guides/reading-paths' },
                { text: 'Profiling', link: '/en/guides/profiling' }
              ]
            },
            {
              text: 'Reference',
              items: [
                { text: 'Coding Style', link: '/en/reference/coding-style' },
                { text: 'Troubleshooting', link: '/en/reference/troubleshooting' },
                { text: 'Integration', link: '/en/reference/integration-examples' },
                { text: 'Benchmarks', link: '/en/benchmarks/' },
                { text: 'Roadmap', link: '/en/roadmap' }
              ]
            }
          ]
        },
        editLink: {
          pattern: docsEditPattern
        },
        lastUpdated: {
          text: 'Last updated'
        },
        docFooter: {
          prev: 'Previous',
          next: 'Next'
        },
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Theme',
        lightModeSwitchTitle: 'Switch to light mode',
        darkModeSwitchTitle: 'Switch to dark mode',
        skipToContentLabel: 'Skip to content',
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © 2026 cuda-foundations Contributors'
        }
      }
    }
  },

  vite: {
    build: {
      chunkSizeWarningLimit: 1500
    }
  }
}))
