'use client';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Link,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

type Platform = 'pinduoduo' | 'taobao';

type PlatformConfig = {
  displayName: string;
  listingsUrl: string;
  expectedEndpoint: string;
  filterKeyword: string;
  screenshotSrc: string;
  placeholderUrl: string;
};

const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  pinduoduo: {
    displayName: '拼多多',
    listingsUrl: 'https://mobile.pinduoduo.com/orders.html',
    expectedEndpoint: 'mobile.pinduoduo.com/proxy/api/api/aristotle/order_list_v4',
    filterKeyword: 'order_list_v4',
    screenshotSrc: '/import-guides/pinduoduo-fetch.png',
    placeholderUrl:
      'https://mobile.pinduoduo.com/proxy/api/api/aristotle/order_list_v4?pdduid=...',
  },
  taobao: {
    displayName: '淘宝',
    listingsUrl: 'https://buyertrade.taobao.com/trade/itemlist/list_bought_items.htm',
    expectedEndpoint: 'h5api.m.taobao.com/h5/mtop.taobao.order.queryboughtlistv2',
    filterKeyword: 'boughtList',
    screenshotSrc: '/import-guides/taobao-fetch.png',
    placeholderUrl:
      'https://h5api.m.taobao.com/h5/mtop.taobao.order.queryboughtlistv2/1.0/?...',
  },
};

type ValidationResult = { ok: true } | { ok: false; message: string };

export function validateFetchCommand(input: string, platform: Platform): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed.toLowerCase().startsWith('fetch(')) {
    return {
      ok: false,
      message: '应使用 "Copy as fetch (Node.js)"，命令需以 "fetch(" 开头',
    };
  }
  const urlMatch = trimmed.match(/fetch\(\s*["']([^"']+)["']/);
  if (!urlMatch) {
    return {
      ok: false,
      message: '无法从 fetch 命令中提取 URL，请确认使用 Chrome 的 "Copy as fetch (Node.js)"',
    };
  }
  const url = urlMatch[1];
  const config = PLATFORM_CONFIG[platform];
  if (!url.toLowerCase().includes(config.expectedEndpoint.toLowerCase())) {
    const wrong = url.match(/https?:\/\/[^/]+\/[^?\s]+/)?.[0] ?? url;
    return {
      ok: false,
      message: `检测到错误的接口 (${wrong})。应为 ${config.expectedEndpoint}（${config.displayName}订单列表）。`,
    };
  }
  return { ok: true };
}

export function getPlaceholderForPlatform(platform: Platform): string {
  const config = PLATFORM_CONFIG[platform];
  return `fetch("${config.placeholderUrl}", { method: "POST", headers: {...}, body: "..." })`;
}

interface Props {
  platform: Platform;
}

export default function FetchCommandGuide({ platform }: Props) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <Stepper orientation="vertical" activeStep={-1} sx={{ mb: 1 }}>
      <Step expanded>
        <StepLabel>打开{config.displayName}订单列表页面</StepLabel>
        <StepContent>
          <Typography variant="body2">
            <Link href={config.listingsUrl} target="_blank" rel="noopener noreferrer">
              {config.listingsUrl}
            </Link>
          </Typography>
        </StepContent>
      </Step>
      <Step expanded>
        <StepLabel>
          打开开发者工具 (F12) → Network 面板，过滤 &quot;{config.filterKeyword}&quot;
        </StepLabel>
        <StepContent>
          <Accordion
            disableGutters
            elevation={0}
            sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
              <Typography variant="body2">查看示例截图</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0 }}>
              <Box
                component="a"
                href={config.screenshotSrc}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'block' }}
              >
                <Box
                  component="img"
                  src={config.screenshotSrc}
                  alt={`${config.displayName} DevTools 示例截图`}
                  sx={{
                    width: '100%',
                    height: 'auto',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'zoom-in',
                  }}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </StepContent>
      </Step>
      <Step expanded>
        <StepLabel>
          右键该请求 → Copy → <strong>Copy as fetch (Node.js)</strong>，粘贴到下方
        </StepLabel>
      </Step>
    </Stepper>
  );
}
