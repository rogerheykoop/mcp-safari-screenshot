#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { takeScreenshot } from './screenshot.js';
// Common viewport sizes
const VIEWPORT_SIZES = {
    desktop: { width: 1920, height: 1080 },
    laptop: { width: 1366, height: 768 },
    'tablet-landscape': { width: 1024, height: 768 },
    'tablet-portrait': { width: 768, height: 1024 },
    'mobile-large': { width: 428, height: 926 },
    'mobile-medium': { width: 390, height: 844 },
    'mobile-small': { width: 375, height: 667 },
};
// Type guard for screenshot arguments
function isScreenshotArgs(args) {
    return typeof args === 'object' && args !== null && 'url' in args && typeof args.url === 'string';
}
// Define the tool properly using the Tool type
const SCREENSHOT_TOOL = {
    name: 'take_screenshot',
    description: 'Take a screenshot of a webpage using Safari on macOS',
    inputSchema: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'URL to capture',
            },
            width: {
                type: 'number',
                description: 'Window width in pixels (default: 1024)',
                default: 1024,
            },
            height: {
                type: 'number',
                description: 'Window height in pixels (default: 768)',
                default: 768,
            },
            waitTime: {
                type: 'number',
                description: 'Time to wait for page load in seconds (default: 3)',
                default: 3,
            },
            zoomLevel: {
                type: 'number',
                description: 'Zoom level (1 = 100%, 0.5 = 50%, 2 = 200%)',
                default: 1,
            },
        },
        required: ['url'],
    },
};
// Server implementation
const server = new Server({
    name: 'safari-screenshot',
    version: '1.0.5',
    description: 'Take screenshots using Safari on macOS',
}, {
    capabilities: {
        tools: {
            take_screenshot: SCREENSHOT_TOOL,
        },
    },
});
// Tool handlers using the correct schemas
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [SCREENSHOT_TOOL],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        if (!args) {
            throw new Error('No arguments provided');
        }
        switch (name) {
            case 'take_screenshot': {
                if (!isScreenshotArgs(args)) {
                    throw new Error('Invalid arguments for take_screenshot');
                }
                const outputPath = `./screenshots/${new URL(args.url).hostname}-${Date.now()}.png`;
                const result = await takeScreenshot({
                    url: args.url,
                    outputPath,
                    width: args.width,
                    height: args.height,
                    waitTime: args.waitTime,
                    zoomLevel: args.zoomLevel,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Screenshot saved to: ${result.path}`,
                        },
                    ],
                    isError: false,
                };
            }
            default:
                return {
                    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});
// Wrap server startup in async function
async function runServer() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('Safari Screenshot MCP Server running on stdio');
    }
    catch (error) {
        console.error('Fatal error running server:', error);
        process.exit(1);
    }
}
// Run the server
runServer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
