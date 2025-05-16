const express = require('express');
const router = express.Router();
const { knex } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all time entries for a user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Check if user is requesting their own time entries or has admin/manager permissions
    if (req.user.id != userId && !['admin', 'project_manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view this user\'s time entries' });
    }
    
    const timeEntries = await knex('time_entries')
      .select(
        'time_entries.*',
        'projects.name as project_name',
        knex.raw('GROUP_CONCAT(DISTINCT funding_sources.name) as funding_sources')
      )
      .leftJoin('projects', 'time_entries.project_id', 'projects.id')
      .leftJoin('time_entry_funding', 'time_entries.id', 'time_entry_funding.time_entry_id')
      .leftJoin('funding_sources', 'time_entry_funding.funding_source_id', 'funding_sources.id')
      .where('time_entries.user_id', userId)
      .groupBy('time_entries.id')
      .orderBy('time_entries.date', 'desc');
    
    res.json(timeEntries);
  } catch (error) {
    console.error('Error getting time entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all time entries for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    // Check if user has permissions to view project time entries
    const userProject = await knex('project_users')
      .where({
        project_id: projectId,
        user_id: req.user.id
      })
      .first();
    
    if (!userProject && !['admin', 'project_manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view this project\'s time entries' });
    }
    
    const timeEntries = await knex('time_entries')
      .select(
        'time_entries.*',
        'users.full_name as user_name',
        'users.username',
        knex.raw('GROUP_CONCAT(DISTINCT funding_sources.name) as funding_sources')
      )
      .leftJoin('users', 'time_entries.user_id', 'users.id')
      .leftJoin('time_entry_funding', 'time_entries.id', 'time_entry_funding.time_entry_id')
      .leftJoin('funding_sources', 'time_entry_funding.funding_source_id', 'funding_sources.id')
      .where('time_entries.project_id', projectId)
      .groupBy('time_entries.id')
      .orderBy(['time_entries.date', 'users.full_name']);
    
    res.json(timeEntries);
  } catch (error) {
    console.error('Error getting project time entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get time entries by funding source
router.get('/funding-source/:fundingSourceId', authenticateToken, async (req, res) => {
  try {
    const fundingSourceId = req.params.fundingSourceId;
    const month = req.query.month;
    
    // Build the query based on conditions
    let query = knex('time_entry_funding')
      .select(
        'time_entries.*',
        'users.full_name as user_name',
        'users.username',
        'projects.name as project_name',
        'time_entry_funding.percentage',
        'time_entry_funding.hours as funding_hours',
        'funding_sources.name as funding_source_name'
      )
      .join('time_entries', 'time_entry_funding.time_entry_id', 'time_entries.id')
      .join('users', 'time_entries.user_id', 'users.id')
      .join('projects', 'time_entries.project_id', 'projects.id')
      .join('funding_sources', 'time_entry_funding.funding_source_id', 'funding_sources.id')
      .where('time_entry_funding.funding_source_id', fundingSourceId);
    
    // Add month filter if provided
    if (month) {
      query = query.whereRaw('time_entries.date LIKE ?', [`${month}%`]);
    }
    
    // Complete the query with ordering
    const timeEntries = await query
      .orderBy(['time_entries.date', 'projects.name', 'users.full_name']);
    
    res.json(timeEntries);
  } catch (error) {
    console.error('Error getting funding source time entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new time entry
router.post('/', authenticateToken, async (req, res) => {
  const trx = await knex.transaction();
  
  try {
    const { user_id, project_id, date, hours, description, entry_type, funding_distribution } = req.body;
    
    // Check if user is creating their own time entry or has admin/manager permissions
    if (req.user.id != user_id && !['admin', 'project_manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create time entries for other users' });
    }
    
    // Check if user is assigned to the project
    const userProject = await trx('project_users')
      .where({
        project_id,
        user_id
      })
      .first();
    
    if (!userProject && !['admin', 'project_manager', 'hr'].includes(req.user.role)) {
      await trx.rollback();
      return res.status(400).json({ message: 'User is not assigned to this project' });
    }
    
    // Create time entry
    const [timeEntryId] = await trx('time_entries').insert({
      user_id,
      project_id,
      date,
      hours,
      description,
      entry_type: entry_type || 'work',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Add funding distribution if provided
    if (funding_distribution && funding_distribution.length > 0) {
      const fundingEntries = funding_distribution.map(item => ({
        time_entry_id: timeEntryId,
        funding_source_id: item.funding_source_id,
        percentage: item.percentage,
        hours: (hours * item.percentage) / 100
      }));
      
      await trx('time_entry_funding').insert(fundingEntries);
    } else {
      // If no funding distribution provided, try to use project's default distribution
      const projectFunding = await trx('project_funding')
        .where('project_id', project_id);
      
      if (projectFunding.length > 0) {
        const fundingEntries = projectFunding.map(item => ({
          time_entry_id: timeEntryId,
          funding_source_id: item.funding_source_id,
          percentage: item.percentage,
          hours: (hours * item.percentage) / 100
        }));
        
        await trx('time_entry_funding').insert(fundingEntries);
      }
    }
    
    await trx.commit();
    
    res.status(201).json({
      message: 'Time entry created successfully',
      timeEntryId
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error creating time entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a time entry
router.put('/:id', authenticateToken, async (req, res) => {
  const trx = await knex.transaction();
  
  try {
    const timeEntryId = req.params.id;
    const { hours, description, entry_type, funding_distribution } = req.body;
    
    // Get the time entry
    const timeEntry = await trx('time_entries')
      .where('id', timeEntryId)
      .first();
    
    if (!timeEntry) {
      await trx.rollback();
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    // Check if user is updating their own time entry or has admin/manager permissions
    if (req.user.id != timeEntry.user_id && !['admin', 'project_manager', 'hr'].includes(req.user.role)) {
      await trx.rollback();
      return res.status(403).json({ message: 'Not authorized to update this time entry' });
    }
    
    // Update time entry
    await trx('time_entries')
      .where('id', timeEntryId)
      .update({
        hours: hours || timeEntry.hours,
        description: description || timeEntry.description,
        entry_type: entry_type || timeEntry.entry_type,
        updated_at: new Date()
      });
    
    // Update funding distribution if provided
    if (funding_distribution && funding_distribution.length > 0) {
      // Delete existing funding entries
      await trx('time_entry_funding')
        .where('time_entry_id', timeEntryId)
        .delete();
      
      // Add new funding entries
      const fundingEntries = funding_distribution.map(item => ({
        time_entry_id: timeEntryId,
        funding_source_id: item.funding_source_id,
        percentage: item.percentage,
        hours: (hours * item.percentage) / 100
      }));
      
      await trx('time_entry_funding').insert(fundingEntries);
    }
    
    await trx.commit();
    
    res.json({
      message: 'Time entry updated successfully'
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error updating time entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a time entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const timeEntryId = req.params.id;
    
    // Get the time entry
    const timeEntry = await knex('time_entries')
      .where('id', timeEntryId)
      .first();
    
    if (!timeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    // Check if user is deleting their own time entry or has admin/manager permissions
    if (req.user.id != timeEntry.user_id && !['admin', 'project_manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete this time entry' });
    }
    
    // Delete time entry (foreign key constraints will handle deleting related funding entries)
    await knex('time_entries')
      .where('id', timeEntryId)
      .delete();
    
    res.json({
      message: 'Time entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 