CREATE TABLE `iam_function_resource` (
	`function_permission_id` text NOT NULL,
	`resource_permission_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`function_permission_id`, `resource_permission_id`),
	FOREIGN KEY (`function_permission_id`) REFERENCES `iam_function`(`permission_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_permission_id`) REFERENCES `iam_resource`(`permission_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_iam_function_resource_resource` ON `iam_function_resource` (`resource_permission_id`);