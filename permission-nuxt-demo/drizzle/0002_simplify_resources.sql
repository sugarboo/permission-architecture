-- API execution points now authorize directly with stable FUNCTION codes.
-- Remove legacy grantable RESOURCE permissions and every relationship that
-- cascades from them before replacing the technical registry.
DELETE FROM `iam_permission` WHERE `type` = 'RESOURCE';
--> statement-breakpoint
DROP TABLE `iam_function_resource`;
--> statement-breakpoint
DROP TABLE `iam_resource`;
--> statement-breakpoint
CREATE TABLE `iam_business_resource` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`resource_type` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_iam_business_resource_code` ON `iam_business_resource` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_iam_business_resource_type_status` ON `iam_business_resource` (`resource_type`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_iam_business_resource_domain` ON `iam_business_resource` (`domain`);
--> statement-breakpoint
CREATE TABLE `iam_function_business_resource` (
	`function_permission_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`function_permission_id`, `resource_id`),
	FOREIGN KEY (`function_permission_id`) REFERENCES `iam_function`(`permission_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `iam_business_resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_iam_function_business_resource_resource` ON `iam_function_business_resource` (`resource_id`);
