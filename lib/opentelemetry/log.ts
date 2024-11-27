import { logger as pinoLogger } from "@/lib/logger";
import type { TokenConsumedSchema } from "@/lib/opentelemetry/types";
import { versionInfo } from "@/version";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";

import type { AnyValue, Logger } from "@opentelemetry/api-logs";
import { Resource } from "@opentelemetry/resources";
import {
	BatchLogRecordProcessor,
	ConsoleLogRecordExporter,
	type LogRecord,
	LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { headers, resource } from "./base";

class PinoLogRecordExporter extends ConsoleLogRecordExporter {
	onEmit(log: LogRecord) {
		const { severityText, body, attributes } = log;

		const message = body?.toString() || "";
		const attrs = attributes ? this.convertAttributes(attributes) : undefined;

		switch (severityText) {
			case "INFO":
				if (attrs) {
					pinoLogger.info(attrs, message);
				} else {
					pinoLogger.info(message);
				}
				break;
			case "ERROR":
				if (attrs) {
					pinoLogger.error(attrs, message);
				} else {
					pinoLogger.error(message);
				}
				break;
			case "DEBUG":
				if (attrs) {
					pinoLogger.debug(attrs, message);
				} else {
					pinoLogger.debug(message);
				}
				break;
			default:
				if (attrs) {
					pinoLogger.info(attrs, message);
				} else {
					pinoLogger.info(message);
				}
		}
	}
	private convertAttributes(
		attributes: Record<string, AnyValue>,
	): Record<string, unknown> {
		const result: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(attributes)) {
			if (value === null || value === undefined) {
				continue;
			}

			if (typeof value === "object") {
				result[key] = JSON.stringify(value);
			} else {
				result[key] = value;
			}
		}

		return result;
	}
}

const logExporter = new OTLPLogExporter({
	url: "https://ingest.us.signoz.cloud:443/v1/logs",
	headers,
});

export const logRecordProcessor = new BatchLogRecordProcessor(logExporter);
export const pinoLogRecordProcessor = new BatchLogRecordProcessor(
	new PinoLogRecordExporter(),
);

let sharedLoggerProvider: LoggerProvider | null = null;
function getOrCreateLoggerProvider() {
	if (!sharedLoggerProvider) {
		sharedLoggerProvider = new LoggerProvider({
			resource: resource.merge(Resource.default()),
		});

		sharedLoggerProvider.addLogRecordProcessor(logRecordProcessor);
		sharedLoggerProvider.addLogRecordProcessor(pinoLogRecordProcessor);
	}
	return sharedLoggerProvider;
}

type SeverityText = "INFO" | "ERROR" | "DEBUG";

type LogSchema = TokenConsumedSchema;

interface OtelLoggerWrapper {
	info: (obj: LogSchema, msg?: string) => void;
	error: (obj: LogSchema | Error, msg?: string) => void;
	debug: (obj: LogSchema, msg?: string) => void;
}

function createEmitLog(otelLogger: Logger) {
	return function emitLog(
		severity: SeverityText,
		obj: object | string | Error,
		msg?: string,
	) {
		if (obj instanceof Error) {
			const errorAttributes: Record<string, string> = {
				name: obj.name,
				message: obj.message,
				stack: obj.stack || "",
			};

			for (const [key, value] of Object.entries(obj)) {
				if (
					typeof value === "string" ||
					typeof value === "number" ||
					typeof value === "boolean"
				) {
					errorAttributes[key] = String(value);
				}
			}

			otelLogger.emit({
				severityText: severity,
				body: obj.message,
				attributes: errorAttributes,
			});
		} else if (typeof obj === "string") {
			otelLogger.emit({
				severityText: severity,
				body: obj,
			});
		} else {
			otelLogger.emit({
				severityText: severity,
				body: msg || "",
				attributes: obj as Record<string, string | number | boolean>,
			});
		}
	};
}

function getSchemaUrl() {
	switch (process.env.NEXT_PUBLIC_VERCEL_ENV) {
		case "production":
			return "https://raw.githubusercontent.com/giselles-ai/giselle/main/lib/opentelemetry/types.ts";
		case "preview":
			return `https://raw.githubusercontent.com/giselles-ai/giselle/refs/heads/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/lib/opentelemetry/types.ts`;
		default: // development
			return "@/lib/opentelemetry/types.ts";
	}
}

export function createLogger(name: string): OtelLoggerWrapper {
	const loggerProvider = getOrCreateLoggerProvider();
	const otelLogger = loggerProvider.getLogger(name, versionInfo.tag, {
		schemaUrl: getSchemaUrl(),
	});
	const emitLog = createEmitLog(otelLogger);

	return {
		info: (obj: LogSchema, msg?: string) => {
			emitLog("INFO", obj, msg);
		},
		error: (obj: LogSchema | Error, msg?: string) => {
			emitLog("ERROR", obj, msg);
		},
		debug: (obj: LogSchema, msg?: string) => {
			emitLog("DEBUG", obj, msg);
		},
	};
}
