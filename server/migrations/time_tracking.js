exports.up = async function(knex) {
  // Create time_entries table for tracking work hours
  await knex.schema.createTable('time_entries', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('project_id').unsigned().notNullable();
    table.date('date').notNullable();
    table.decimal('hours', 5, 2).notNullable();
    table.text('description');
    table.enu('entry_type', ['work', 'vacation', 'sick_leave', 'holiday', 'other']).defaultTo('work');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('project_id').references('projects.id').onDelete('CASCADE');
  });

  // Create time_entry_funding for distributing time entries across funding sources
  return knex.schema.createTable('time_entry_funding', (table) => {
    table.integer('time_entry_id').unsigned().notNullable();
    table.integer('funding_source_id').unsigned().notNullable();
    table.decimal('percentage', 5, 2).notNullable().defaultTo(100);
    table.decimal('hours', 5, 2).notNullable();
    
    table.foreign('time_entry_id').references('time_entries.id').onDelete('CASCADE');
    table.foreign('funding_source_id').references('funding_sources.id').onDelete('CASCADE');
    
    table.primary(['time_entry_id', 'funding_source_id']);
  });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('time_entry_funding')
    .dropTableIfExists('time_entries');
}; 