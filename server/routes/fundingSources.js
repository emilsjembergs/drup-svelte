const express = require('express');
const router = express.Router();
const { knex } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all funding sources
router.get('/', authenticateToken, async (req, res) => {
  try {
    const fundingSources = await knex('funding_sources')
      .select('*')
      .orderBy('name');
    
    res.json(fundingSources);
  } catch (error) {
    console.error('Error getting funding sources:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single funding source
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const fundingSourceId = req.params.id;
    
    const fundingSource = await knex('funding_sources')
      .where('id', fundingSourceId)
      .first();
    
    if (!fundingSource) {
      return res.status(404).json({ message: 'Funding source not found' });
    }
    
    res.json(fundingSource);
  } catch (error) {
    console.error('Error getting funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new funding source
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!['admin', 'project_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create funding sources' });
    }
    
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const [fundingSourceId] = await knex('funding_sources').insert({
      name,
      description,
      created_at: new Date()
    });
    
    res.status(201).json({
      message: 'Funding source created successfully',
      fundingSourceId
    });
  } catch (error) {
    console.error('Error creating funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a funding source
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!['admin', 'project_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update funding sources' });
    }
    
    const fundingSourceId = req.params.id;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const updateCount = await knex('funding_sources')
      .where('id', fundingSourceId)
      .update({
        name,
        description
      });
    
    if (updateCount === 0) {
      return res.status(404).json({ message: 'Funding source not found' });
    }
    
    res.json({
      message: 'Funding source updated successfully'
    });
  } catch (error) {
    console.error('Error updating funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a funding source
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!['admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete funding sources' });
    }
    
    const fundingSourceId = req.params.id;
    
    // Check if the funding source is in use
    const usageCount = await knex('project_funding')
      .where('funding_source_id', fundingSourceId)
      .count('* as count')
      .first();
    
    if (usageCount.count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete funding source because it is in use by one or more projects'
      });
    }
    
    await knex('funding_sources')
      .where('id', fundingSourceId)
      .delete();
    
    res.json({
      message: 'Funding source deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get project funding distribution
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    const fundingDistribution = await knex('project_funding')
      .select(
        'project_funding.*',
        'funding_sources.name',
        'funding_sources.description'
      )
      .leftJoin('funding_sources', 'project_funding.funding_source_id', 'funding_sources.id')
      .where('project_funding.project_id', projectId);
    
    res.json(fundingDistribution);
  } catch (error) {
    console.error('Error getting project funding distribution:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get projects using a specific funding source
router.get('/:id/projects', authenticateToken, async (req, res) => {
  try {
    const fundingSourceId = req.params.id;
    
    const projects = await knex('projects')
      .select(
        'projects.id',
        'projects.name',
        'projects.description',
        'project_funding.amount',
        'project_funding.percentage'
      )
      .join('project_funding', 'projects.id', 'project_funding.project_id')
      .where('project_funding.funding_source_id', fundingSourceId);
    
    res.json(projects);
  } catch (error) {
    console.error('Error getting projects using funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 