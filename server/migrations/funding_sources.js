exports.up = async function(knex) {
  // Create funding_sources table
  await knex.schema.createTable('funding_sources', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create project_funding table for many-to-many relationship
  // with amount per funding source
  return knex.schema.createTable('project_funding', (table) => {
    table.integer('project_id').unsigned().notNullable();
    table.integer('funding_source_id').unsigned().notNullable();
    table.decimal('amount', 10, 2).notNullable().defaultTo(0);
    table.decimal('percentage', 5, 2).notNullable().defaultTo(0);
    
    table.foreign('project_id').references('projects.id').onDelete('CASCADE');
    table.foreign('funding_source_id').references('funding_sources.id').onDelete('CASCADE');
    
    table.primary(['project_id', 'funding_source_id']);
  });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('project_funding')
    .dropTableIfExists('funding_sources');
}; 